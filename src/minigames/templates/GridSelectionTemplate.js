/**
 * GridSelectionTemplate.js — Reusable Grid Selection Mini-Game Template.
 * A grid matrix of hidden nodes with proximity cues (Hot / Warm / Cold).
 * Used for Shortwave Radio Frequency Tuning and Ruin Scavenging / Searching.
 */

import { getQualityTier, createRewardId } from '../contracts.js';

export class GridSelectionTemplate {
  /**
   * Mount and start Grid Selection mini-game.
   * @param {HTMLElement} stageElement - Overlay container.
   * @param {object} derivedParams - Parameters from DifficultySystem.
   * @param {number} [derivedParams.gridSize=4] - Grid dimension (3 to 5).
   * @param {number} [derivedParams.targetCount=3] - Number of hidden targets to find.
   * @param {number} [derivedParams.allowedMistakes=2] - Extra probe allowances before exhaustion.
   * @param {object} context
   * @param {string} [context.activityType='radio_tuning']
   * @param {number} [context.gameMinutesSpent=20]
   * @param {Function} context.onSubmit - Callback(MiniGameResult)
   * @param {Function} context.onCancel - Callback()
   * @param {Function} [context.setFeedback] - Callback(msg, type)
   * @param {Function} [context.setProgress] - Callback(percent, label)
   * @param {Function} [context.setActionButton] - Callback(label, onClick)
   */
  static mount(stageElement, derivedParams, {
    activityType = 'radio_tuning',
    gameMinutesSpent = 20,
    onSubmit,
    onCancel,
    setFeedback = () => {},
    setProgress = () => {},
    setActionButton = () => {},
  }) {
    stageElement.innerHTML = '';

    const size = Math.max(3, Math.min(5, derivedParams.gridSize || 4));
    const totalCells = size * size;
    const targetCount = Math.max(2, Math.min(totalCells - 2, derivedParams.targetCount || 3));
    const extraProbes = Math.max(2, (derivedParams.allowedMistakes || 2) + 2);
    const maxProbes = targetCount + extraProbes;

    let remainingProbes = maxProbes;
    let foundTargets = 0;
    let isResolved = false;

    // Pick random target cell coordinates
    const targetIndices = new Set();
    while (targetIndices.size < targetCount) {
      const idx = Math.floor(Math.random() * totalCells);
      targetIndices.add(idx);
    }

    // Build DOM structure
    const container = document.createElement('div');
    container.className = 'grid-selection-container';
    container.setAttribute('data-testid', 'grid-selection-container');

    const isRadio = activityType.includes('radio');
    const headerTitle = isRadio ? 'Carrier Frequency Matrix' : 'Scavenge Grid Search';
    const targetLabel = isRadio ? 'Broadcast Frequencies' : 'Cache Items';

    container.innerHTML = `
      <div class="grid-header">
        <div class="grid-probe-counter" id="grid-probe-counter">
          Remaining Probes: <strong>${remainingProbes}/${maxProbes}</strong>
        </div>
        <div class="grid-status-badge" id="grid-status-badge">
          ${targetLabel}: <strong>0/${targetCount} Locked</strong>
        </div>
      </div>

      <div
        class="radar-grid"
        id="radar-grid"
        data-testid="radar-grid"
        style="grid-template-columns: repeat(${size}, 1fr);"
      >
        ${Array.from({ length: totalCells }, (_, i) => `
          <button
            class="radar-cell"
            data-index="${i}"
            data-row="${Math.floor(i / size)}"
            data-col="${i % size}"
            data-testid="grid-cell-${i}"
            title="Probe Node ${i + 1}"
          >
            <span class="cell-signal-icon">${isRadio ? '📡' : '📦'}</span>
            <span class="cell-feedback-text"></span>
          </button>
        `).join('')}
      </div>
    `;

    stageElement.appendChild(container);

    const probeCounter = container.querySelector('#grid-probe-counter');
    const statusBadge = container.querySelector('#grid-status-badge');
    const cells = container.querySelectorAll('.radar-cell');

    setProgress(0, `0/${targetCount} Signals Found`);
    setFeedback(
      isRadio
        ? 'Click frequency nodes to locate clear carrier wave spikes.'
        : 'Search compartments to discover cached survival supplies.',
      'info'
    );

    // Calculate Manhattan distance to closest undiscovered target
    const getMinDistanceToTarget = (row, col) => {
      let minDist = 999;
      for (const tIdx of targetIndices) {
        const tRow = Math.floor(tIdx / size);
        const tCol = tIdx % size;
        const dist = Math.abs(tRow - row) + Math.abs(tCol - col);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    };

    cells.forEach((cell) => {
      cell.addEventListener('click', () => {
        if (isResolved || cell.classList.contains('probed')) return;

        cell.classList.add('probed');
        cell.disabled = true;
        remainingProbes--;
        if (probeCounter) {
          probeCounter.innerHTML = `Remaining Probes: <strong>${remainingProbes}/${maxProbes}</strong>`;
        }

        const idx = Number(cell.getAttribute('data-index'));
        const row = Number(cell.getAttribute('data-row'));
        const col = Number(cell.getAttribute('data-col'));
        const textSpan = cell.querySelector('.cell-feedback-text');
        const iconSpan = cell.querySelector('.cell-signal-icon');

        if (targetIndices.has(idx)) {
          // TARGET FOUND!
          targetIndices.delete(idx);
          foundTargets++;
          cell.classList.add('cell-target-found');
          if (iconSpan) iconSpan.textContent = isRadio ? '📻' : '✨';
          if (textSpan) textSpan.textContent = 'SIGNAL';

          if (statusBadge) {
            statusBadge.innerHTML = `${targetLabel}: <strong>${foundTargets}/${targetCount} Locked</strong>`;
          }

          const pct = Math.round((foundTargets / targetCount) * 100);
          setProgress(pct, `${foundTargets}/${targetCount} Locked`);
          setFeedback(`Carrier frequency spike detected! ${targetCount - foundTargets} remaining.`, 'success');

          // Check if all targets found
          if (foundTargets >= targetCount) {
            isResolved = true;
            // Efficiency score based on unused probes
            const probeRatio = remainingProbes / maxProbes;
            const score = Number(Math.max(0.65, Math.min(1.0, 0.75 + probeRatio * 0.25)).toFixed(3));
            const qualityTier = getQualityTier(score);

            setFeedback(`All signals synchronized! Broadcast feed clear (${qualityTier.toUpperCase()}).`, 'success');

            setTimeout(() => {
              onSubmit({
                outcome: 'success',
                score,
                qualityTier,
                gameMinutesSpent,
                rewardId: createRewardId(activityType, `grid_${Date.now()}`),
                metadata: {
                  foundTargets,
                  probesRemaining: remainingProbes,
                },
              });
            }, 600);
            return;
          }
        } else {
          // Miss: Show proximity hint
          const dist = getMinDistanceToTarget(row, col);

          if (dist === 1) {
            cell.classList.add('cell-hot');
            if (iconSpan) iconSpan.textContent = '🔥';
            if (textSpan) textSpan.textContent = 'HOT';
            setFeedback('HOT! Strong carrier harmonic detected adjacent to this node.', 'info');
          } else if (dist === 2) {
            cell.classList.add('cell-warm');
            if (iconSpan) iconSpan.textContent = '⚡';
            if (textSpan) textSpan.textContent = 'WARM';
            setFeedback('WARM: Faint transmission ripple within two sectors.', 'info');
          } else {
            cell.classList.add('cell-cold');
            if (iconSpan) iconSpan.textContent = '🌫️';
            if (textSpan) textSpan.textContent = 'COLD';
            setFeedback('COLD: Flatline static noise.', 'info');
          }
        }

        // Check probe exhaustion
        if (remainingProbes <= 0 && foundTargets < targetCount) {
          isResolved = true;
          cell.classList.add('exhausted');
          setFeedback('Tuner antenna battery drained! Signal lost.', 'danger');
          setProgress(Math.round((foundTargets / targetCount) * 100), 'Exhausted');

          setTimeout(() => {
            onSubmit({
              outcome: 'failure',
              score: 0.35,
              qualityTier: 'poor',
              gameMinutesSpent,
              rewardId: createRewardId(activityType, `grid_fail_${Date.now()}`),
              metadata: {
                foundTargets,
                targetCount,
                probesExhausted: true,
              },
            });
          }, 600);
        }
      });
    });

    return {
      cleanup: () => {
        isResolved = true;
      },
    };
  }
}
