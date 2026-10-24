/**
 * ConnectMatchTemplate.js — Reusable Connect and Match Mini-Game Template.
 * Connect components, electrical circuits, diagnosis pairs, or word terms.
 * Used for Electrical Circuit Repair, Generator Maintenance, and Diagnosis matching.
 */

import { getQualityTier, createRewardId } from '../contracts.js';

export const DEFAULT_CIRCUIT_PAIRS = [
  { id: 'pwr_main', leftLabel: 'Main 120V Feed', rightLabel: 'Distribution Bus', color: '#e6ad61' },
  { id: 'gen_aux', leftLabel: 'Aux Generator', rightLabel: 'Water Pump Relay', color: '#58b5a0' },
  { id: 'cap_bank', leftLabel: 'Capacitor Bank', rightLabel: 'Perimeter Breaker', color: '#a880d8' },
  { id: 'gnd_safety', leftLabel: 'Safety Ground', rightLabel: 'Earth Ground Rod', color: '#7aa668' },
  { id: 'trans_step', leftLabel: 'Step Transformer', rightLabel: 'Cabin Lighting', color: '#d86860' },
];

export class ConnectMatchTemplate {
  /**
   * Mount and start the Connect and Match mini-game.
   * @param {HTMLElement} stageElement - Container inside the modal overlay.
   * @param {object} derivedParams - Parameters derived from difficulty.
   * @param {number} [derivedParams.pairCount=4] - Number of pairs to connect (3 - 5).
   * @param {number} [derivedParams.allowedMistakes=2] - Maximum allowed wrong connections.
   * @param {object} context
   * @param {string} [context.activityType='circuit_repair']
   * @param {Array<object>} [context.pairs] - Optional custom pair definitions.
   * @param {number} [context.gameMinutesSpent=20]
   * @param {Function} context.onSubmit - Callback(MiniGameResult)
   * @param {Function} context.onCancel - Callback()
   * @param {Function} [context.setFeedback] - Callback(msg, type)
   * @param {Function} [context.setProgress] - Callback(percent, label)
   * @param {Function} [context.setActionButton] - Callback(label, onClick)
   */
  static mount(stageElement, derivedParams, {
    activityType = 'circuit_repair',
    pairs = null,
    gameMinutesSpent = 20,
    onSubmit,
    onCancel,
    setFeedback = () => {},
    setProgress = () => {},
    setActionButton = () => {},
  }) {
    stageElement.innerHTML = '';

    const pairCount = Math.max(3, Math.min(5, derivedParams.pairCount || 4));
    const allowedMistakes = Math.max(1, derivedParams.allowedMistakes || 2);
    let mistakes = 0;

    // Select subset of pairs
    const sourcePairs = Array.isArray(pairs) && pairs.length >= pairCount ? pairs : DEFAULT_CIRCUIT_PAIRS;
    const selectedPairs = sourcePairs.slice(0, pairCount);

    // Left items in original order
    const leftItems = selectedPairs.map((p) => ({ id: p.id, label: p.leftLabel, color: p.color }));

    // Right items shuffled deterministically
    const rightItems = selectedPairs
      .map((p) => ({ id: p.id, label: p.rightLabel, color: p.color }))
      .sort(() => Math.random() - 0.5);

    // State tracking
    const matchedPairIds = new Set();
    let selectedLeftId = null;
    let isResolved = false;

    // Build DOM structure
    const board = document.createElement('div');
    board.className = 'connect-match-board';
    board.setAttribute('data-testid', 'connect-match-board');

    board.innerHTML = `
      <div class="circuit-instructions-header">
        <span class="circuit-mistakes-label" id="circuit-mistakes-label">
          Fault Tolerance: <strong>${allowedMistakes - mistakes}</strong> errors allowed
        </span>
        <span class="circuit-status-count" id="circuit-status-count">
          Connected: <strong>0/${pairCount}</strong>
        </span>
      </div>

      <div class="circuit-columns">
        <div class="circuit-col circuit-col-left" id="circuit-col-left">
          ${leftItems.map((item) => `
            <button
              class="terminal-node terminal-node-left"
              data-id="${item.id}"
              data-side="left"
              data-testid="terminal-left-${item.id}"
              style="--node-color: ${item.color};"
            >
              <span class="terminal-pin"></span>
              <span class="terminal-label">${item.label}</span>
            </button>
          `).join('')}
        </div>

        <div class="circuit-center-space">
          <svg class="circuit-wires-svg" id="circuit-wires-svg"></svg>
        </div>

        <div class="circuit-col circuit-col-right" id="circuit-col-right">
          ${rightItems.map((item) => `
            <button
              class="terminal-node terminal-node-right"
              data-id="${item.id}"
              data-side="right"
              data-testid="terminal-right-${item.id}"
              style="--node-color: ${item.color};"
            >
              <span class="terminal-label">${item.label}</span>
              <span class="terminal-pin"></span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    stageElement.appendChild(board);

    const mistakesLabel = board.querySelector('#circuit-mistakes-label');
    const statusCount = board.querySelector('#circuit-status-count');
    const svgEl = board.querySelector('#circuit-wires-svg');

    setProgress(0, `0/${pairCount} Connected`);
    setFeedback('Select an input terminal on the left, then connect to its matching circuit output.', 'info');

    // Terminal click handling
    const leftButtons = board.querySelectorAll('.terminal-node-left');
    const rightButtons = board.querySelectorAll('.terminal-node-right');

    const updateWires = () => {
      if (!svgEl) return;
      svgEl.innerHTML = '';
      const boardRect = board.getBoundingClientRect();

      for (const pairId of matchedPairIds) {
        const leftBtn = board.querySelector(`.terminal-node-left[data-id="${pairId}"]`);
        const rightBtn = board.querySelector(`.terminal-node-right[data-id="${pairId}"]`);
        if (!leftBtn || !rightBtn) continue;

        const leftPin = leftBtn.querySelector('.terminal-pin')?.getBoundingClientRect();
        const rightPin = rightBtn.querySelector('.terminal-pin')?.getBoundingClientRect();
        if (!leftPin || !rightPin) continue;

        const x1 = leftPin.right - boardRect.left;
        const y1 = leftPin.top + leftPin.height / 2 - boardRect.top;
        const x2 = rightPin.left - boardRect.left;
        const y2 = rightPin.top + rightPin.height / 2 - boardRect.top;

        const pairDef = selectedPairs.find((p) => p.id === pairId);
        const color = pairDef?.color || '#e6ad61';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cx1 = x1 + (x2 - x1) * 0.45;
        const cx2 = x1 + (x2 - x1) * 0.55;
        path.setAttribute('d', `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '4');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        svgEl.appendChild(path);
      }
    };

    leftButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isResolved) return;
        const id = btn.getAttribute('data-id');
        if (matchedPairIds.has(id)) return;

        leftButtons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedLeftId = id;
        setFeedback(`Selected terminal: ${btn.querySelector('.terminal-label')?.textContent}. Now select matching output.`, 'info');
      });
    });

    rightButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isResolved) return;
        const rightId = btn.getAttribute('data-id');
        if (matchedPairIds.has(rightId)) return;

        if (!selectedLeftId) {
          setFeedback('Select a left terminal pin first before connecting.', 'info');
          return;
        }

        const leftBtn = board.querySelector(`.terminal-node-left[data-id="${selectedLeftId}"]`);

        // Check if correct match
        if (selectedLeftId === rightId) {
          // Success match
          matchedPairIds.add(rightId);
          leftBtn?.classList.remove('selected');
          leftBtn?.classList.add('connected');
          btn.classList.add('connected');
          selectedLeftId = null;

          statusCount.innerHTML = `Connected: <strong>${matchedPairIds.size}/${pairCount}</strong>`;
          const pct = Math.round((matchedPairIds.size / pairCount) * 100);
          setProgress(pct, `${matchedPairIds.size}/${pairCount} Wired`);
          setFeedback('Terminal successfully bridged! Voltage stabilizing.', 'success');
          updateWires();

          // Check if all connected
          if (matchedPairIds.size >= pairCount) {
            isResolved = true;
            const score = Math.max(0.60, 1.0 - mistakes * 0.15);
            const qualityTier = getQualityTier(score);

            setFeedback(`Circuit completely restored! Quality: ${qualityTier.toUpperCase()}.`, 'success');

            setTimeout(() => {
              onSubmit({
                outcome: 'success',
                score: Number(score.toFixed(3)),
                qualityTier,
                gameMinutesSpent,
                rewardId: createRewardId(activityType, `circuit_${Date.now()}`),
                metadata: {
                  pairsCount: pairCount,
                  mistakes,
                },
              });
            }, 600);
          }
        } else {
          // Wrong match!
          mistakes++;
          const remainingErrors = Math.max(0, allowedMistakes - mistakes);
          mistakesLabel.innerHTML = `Fault Tolerance: <strong>${remainingErrors}</strong> errors allowed`;

          btn.classList.add('error-pulse');
          setTimeout(() => btn.classList.remove('error-pulse'), 450);

          if (mistakes >= allowedMistakes) {
            // Failure: blown fuse / overloaded breaker
            isResolved = true;
            setFeedback('Circuit blown! Overloaded terminals caused electrical fault.', 'danger');
            setProgress(Math.round((matchedPairIds.size / pairCount) * 100), 'Overloaded');

            setTimeout(() => {
              onSubmit({
                outcome: 'failure',
                score: 0.30,
                qualityTier: 'poor',
                gameMinutesSpent,
                rewardId: createRewardId(activityType, `circuit_fail_${Date.now()}`),
                metadata: { mistakes, connected: matchedPairIds.size },
              });
            }, 600);
          } else {
            setFeedback(`Mismatched impedance! ${remainingErrors} fault allowance remaining.`, 'danger');
          }
        }
      });
    });

    // Window resize to redraw SVG paths
    const resizeHandler = () => updateWires();
    window.addEventListener('resize', resizeHandler);

    return {
      cleanup: () => {
        window.removeEventListener('resize', resizeHandler);
      },
    };
  }
}
