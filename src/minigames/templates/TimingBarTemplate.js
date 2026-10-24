/**
 * TimingBarTemplate.js — Reusable Timing Bar Mini-Game Template.
 * A moving needle indicator oscillates across a track; player strikes when the needle
 * aligns inside the target sweet spot.
 * Used for Harvesting, Watering, Wood Chopping, and Carpentry cutting.
 */

import { getQualityTier, createRewardId } from '../contracts.js';

export class TimingBarTemplate {
  /**
   * Mount and start the Timing Bar mini-game.
   * @param {HTMLElement} stageElement - Container inside the modal overlay.
   * @param {object} derivedParams - Parameters derived from difficulty.
   * @param {number} [derivedParams.targetZoneWidth=28] - Target zone width in percentage (14% - 42%).
   * @param {number} [derivedParams.indicatorSpeed=280] - Needle speed in px/sec.
   * @param {number} [derivedParams.attempts=2] - Total strikes allowed.
   * @param {object} context
   * @param {string} context.activityType - e.g. 'harvest', 'wood_chop'.
   * @param {number} [context.gameMinutesSpent=15] - Game minutes to advance on completion.
   * @param {Function} context.onSubmit - Callback(MiniGameResult)
   * @param {Function} context.onCancel - Callback()
   * @param {Function} [context.setFeedback] - Callback(msg, type)
   * @param {Function} [context.setProgress] - Callback(percent, label)
   * @param {Function} [context.setActionButton] - Callback(label, onClick)
   */
  static mount(stageElement, derivedParams, {
    activityType = 'timing_activity',
    gameMinutesSpent = 15,
    onSubmit,
    onCancel,
    setFeedback = () => {},
    setProgress = () => {},
    setActionButton = () => {},
  }) {
    stageElement.innerHTML = '';

    const targetWidthPct = Math.max(12, Math.min(48, derivedParams.targetZoneWidth || 28));
    const speedPxPerSec = Math.max(140, Math.min(500, derivedParams.indicatorSpeed || 280));
    const totalAttempts = Math.max(1, Math.min(3, derivedParams.attempts || 2));
    let remainingAttempts = totalAttempts;

    // Randomize target zone center between 25% and 75%
    const minCenter = 15 + targetWidthPct / 2;
    const maxCenter = 85 - targetWidthPct / 2;
    const targetCenterPct = Math.round(minCenter + Math.random() * (maxCenter - minCenter));
    const targetLeftPct = targetCenterPct - targetWidthPct / 2;

    // Build DOM structure
    const container = document.createElement('div');
    container.className = 'timing-bar-container';
    container.setAttribute('data-testid', 'timing-bar-container');

    container.innerHTML = `
      <div class="timing-bar-header">
        <span class="timing-attempts-label" id="timing-attempts-label" data-testid="timing-attempts-label">
          Attempts Remaining: <strong>${remainingAttempts}/${totalAttempts}</strong>
        </span>
        <span class="timing-prompt-badge">Press SPACE or Click STRIKE</span>
      </div>

      <div class="timing-track" id="timing-track" data-testid="timing-track">
        <!-- Target Sweet Spot Zone -->
        <div
          class="timing-target-zone"
          data-testid="timing-target-zone"
          style="left: ${targetLeftPct}%; width: ${targetWidthPct}%;"
        >
          <div class="timing-bullseye" title="Bullseye Perfect Zone"></div>
        </div>

        <!-- Moving Needle Indicator -->
        <div class="timing-needle" id="timing-needle" data-testid="timing-needle" style="left: 0%;">
          <div class="timing-needle-head"></div>
        </div>
      </div>
    `;

    stageElement.appendChild(container);

    const needleEl = container.querySelector('#timing-needle');
    const attemptsLabel = container.querySelector('#timing-attempts-label');

    let needlePos = 0; // 0 to 100 percentage
    let direction = 1;
    let isRunning = true;
    let isResolved = false;
    let animFrameId = null;
    let lastTime = performance.now();

    setProgress(0, 'Align needle inside green zone');

    // Oscillation loop
    const tick = (now) => {
      if (!isRunning) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Track width roughly 460px, so calculate percentage step per second
      const trackWidthPx = container.querySelector('.timing-track')?.clientWidth || 460;
      const pctPerSec = (speedPxPerSec / trackWidthPx) * 100;

      needlePos += direction * pctPerSec * dt;

      if (needlePos >= 100) {
        needlePos = 100;
        direction = -1;
      } else if (needlePos <= 0) {
        needlePos = 0;
        direction = 1;
      }

      if (needleEl) {
        needleEl.style.left = `${needlePos}%`;
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    // Strike evaluation
    const triggerStrike = () => {
      if (!isRunning || isResolved) return;

      const distFromCenter = Math.abs(needlePos - targetCenterPct);
      const halfTarget = targetWidthPct / 2;
      const bullseyeHalf = halfTarget * 0.35;

      let strikeScore = 0;
      let outcome = 'success';
      let message = '';
      let feedbackType = 'info';

      if (distFromCenter <= bullseyeHalf) {
        // Bullseye perfect hit
        strikeScore = 0.95 + (1 - distFromCenter / bullseyeHalf) * 0.05;
        message = 'PERFECT STRIKE! Outstanding precision!';
        feedbackType = 'success';
        isResolved = true;
      } else if (distFromCenter <= halfTarget) {
        // Good sweet spot hit
        const ratio = 1 - (distFromCenter - bullseyeHalf) / (halfTarget - bullseyeHalf);
        strikeScore = 0.70 + ratio * 0.22;
        message = 'Solid hit right in the sweet spot!';
        feedbackType = 'success';
        isResolved = true;
      } else if (distFromCenter <= halfTarget + 8) {
        // Close margin strike
        strikeScore = 0.45;
        message = 'Grazing strike on the outer perimeter.';
        feedbackType = 'info';
        isResolved = true;
      } else {
        // Complete miss
        remainingAttempts--;
        if (attemptsLabel) {
          attemptsLabel.innerHTML = `Attempts Remaining: <strong>${remainingAttempts}/${totalAttempts}</strong>`;
        }

        if (remainingAttempts > 0) {
          setFeedback(`Missed the sweet spot! ${remainingAttempts} attempt remaining.`, 'danger');
          // Brief red shake effect on track
          const track = container.querySelector('#timing-track');
          track?.classList.add('shake');
          setTimeout(() => track?.classList.remove('shake'), 350);
          return;
        } else {
          // Out of attempts: partial/poor outcome
          strikeScore = 0.25;
          outcome = 'failure';
          message = 'Missed all attempts! Yield diminished.';
          feedbackType = 'danger';
          isResolved = true;
        }
      }

      isRunning = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);

      const qualityTier = getQualityTier(strikeScore);
      setFeedback(message, feedbackType);
      setProgress(Math.round(strikeScore * 100), `${qualityTier.toUpperCase()} (${Math.round(strikeScore * 100)}%)`);

      // Freeze needle at hit position with flash
      if (needleEl) {
        needleEl.classList.add(outcome === 'success' ? 'hit-success' : 'hit-miss');
      }

      // Conclude and submit after short celebration window
      setTimeout(() => {
        cleanup();
        onSubmit({
          outcome: outcome === 'success' ? 'success' : 'failure',
          score: Number(strikeScore.toFixed(3)),
          qualityTier,
          gameMinutesSpent,
          rewardId: createRewardId(activityType, `timing_${Date.now()}`),
          metadata: {
            distFromCenter: Number(distFromCenter.toFixed(2)),
            attemptsUsed: totalAttempts - remainingAttempts + 1,
          },
        });
      }, 600);
    };

    // Bind Primary Action Button in footer
    setActionButton('Strike (SPACE)', triggerStrike);

    // Keyboard Spacebar strike listener
    const keyHandler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerStrike();
      }
    };
    window.addEventListener('keydown', keyHandler);

    // Cleanup helper
    const cleanup = () => {
      isRunning = false;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      window.removeEventListener('keydown', keyHandler);
    };

    return {
      cleanup,
      triggerStrike,
    };
  }
}
