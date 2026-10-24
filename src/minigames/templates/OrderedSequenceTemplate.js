/**
 * OrderedSequenceTemplate.js — Reusable Ordered Sequence Mini-Game Template.
 * Player must perform a set of distinct procedural steps in the correct order.
 * Used for Cooking Meals, Sanitizing & Cleaning, Engine Tuning, and Medical First Aid.
 */

import { getQualityTier, createRewardId } from '../contracts.js';

export const DEFAULT_COOKING_STEPS = [
  { id: 'prep_veggies', label: '1. Chop Vegetables', icon: '🔪', tip: 'Dice fresh roots and greens' },
  { id: 'heat_water', label: '2. Boil Well Water', icon: '🔥', tip: 'Heat water in cast-iron kettle' },
  { id: 'season_broth', label: '3. Add Salt & Herbs', icon: '🌿', tip: 'Season stew for taste and longevity' },
  { id: 'simmer_pot', label: '4. Simmer Over Low Heat', icon: '🍲', tip: 'Allow ingredients to tenderize' },
  { id: 'serve_stew', label: '5. Ladle into Bowls', icon: '🥣', tip: 'Dish out piping hot portions' },
];

export const DEFAULT_CLEANING_STEPS = [
  { id: 'clear_bench', label: '1. Clear Work Surface', icon: '🧹', tip: 'Remove clutter and loose debris' },
  { id: 'apply_soap', label: '2. Apply Lye Soap', icon: '🧼', tip: 'Spread disinfectant solution' },
  { id: 'scrub_stains', label: '3. Scrub Grime & Grease', icon: '🧽', tip: 'Scour stubborn residue' },
  { id: 'rinse_water', label: '4. Rinse with Fresh Water', icon: '💧', tip: 'Wash off dirty suds' },
  { id: 'dry_cloth', label: '5. Wipe Dry with Towel', icon: '🧺', tip: 'Prevent mold and rust' },
];

export class OrderedSequenceTemplate {
  /**
   * Mount and run the Ordered Sequence mini-game.
   * @param {HTMLElement} stageElement - Overlay container.
   * @param {object} derivedParams - Parameters from DifficultySystem.
   * @param {number} [derivedParams.stepCount=4] - Number of steps to complete.
   * @param {number} [derivedParams.allowedMistakes=2] - Allowed incorrect step picks.
   * @param {object} context
   * @param {string} [context.activityType='cooking']
   * @param {Array<object>} [context.steps] - Custom steps list.
   * @param {number} [context.gameMinutesSpent=20]
   * @param {Function} context.onSubmit - Callback(MiniGameResult)
   * @param {Function} context.onCancel - Callback()
   * @param {Function} [context.setFeedback] - Callback(msg, type)
   * @param {Function} [context.setProgress] - Callback(percent, label)
   * @param {Function} [context.setActionButton] - Callback(label, onClick)
   */
  static mount(stageElement, derivedParams, {
    activityType = 'cooking',
    steps = null,
    gameMinutesSpent = 20,
    onSubmit,
    onCancel,
    setFeedback = () => {},
    setProgress = () => {},
    setActionButton = () => {},
  }) {
    stageElement.innerHTML = '';

    const stepCount = Math.max(2, Math.min(6, derivedParams.stepCount || 4));
    const allowedMistakes = Math.max(1, derivedParams.allowedMistakes || 2);
    let mistakes = 0;

    // Pick sequence steps
    const sourceSteps = Array.isArray(steps) && steps.length >= stepCount
      ? steps
      : (activityType === 'cleaning' ? DEFAULT_CLEANING_STEPS : DEFAULT_COOKING_STEPS);

    const targetSequence = sourceSteps.slice(0, stepCount);
    let currentStepIndex = 0;
    let isResolved = false;

    // Shuffle buttons for display so the player must choose the correct step
    const shuffledSteps = [...targetSequence].sort(() => Math.random() - 0.5);

    // Build DOM structure
    const container = document.createElement('div');
    container.className = 'sequence-container';
    container.setAttribute('data-testid', 'sequence-container');

    container.innerHTML = `
      <div class="sequence-header">
        <div class="sequence-fault-badge" id="sequence-fault-badge">
          Allowed Errors: <strong>${allowedMistakes - mistakes}</strong>
        </div>
        <div class="sequence-target-badge" id="sequence-target-badge">
          Current Goal: <strong>${targetSequence[0]?.label}</strong>
        </div>
      </div>

      <div class="sequence-steps-timeline" id="sequence-steps-timeline">
        ${targetSequence.map((step, idx) => `
          <div class="sequence-timeline-node ${idx === 0 ? 'current' : ''}" data-step-index="${idx}">
            <span class="timeline-step-num">${idx + 1}</span>
            <span class="timeline-step-label">${step.label.replace(/^\d+\.\s*/, '')}</span>
          </div>
        `).join('')}
      </div>

      <div class="sequence-buttons-grid" id="sequence-buttons-grid">
        ${shuffledSteps.map((step) => `
          <button
            class="sequence-action-btn"
            data-step-id="${step.id}"
            data-testid="sequence-btn-${step.id}"
          >
            <span class="btn-step-icon">${step.icon || '⚙️'}</span>
            <span class="btn-step-title">${step.label}</span>
            <span class="btn-step-tip">${step.tip || ''}</span>
          </button>
        `).join('')}
      </div>
    `;

    stageElement.appendChild(container);

    const faultBadge = container.querySelector('#sequence-fault-badge');
    const targetBadge = container.querySelector('#sequence-target-badge');
    const timelineNodes = container.querySelectorAll('.sequence-timeline-node');
    const actionButtons = container.querySelectorAll('.sequence-action-btn');

    setProgress(0, `0/${stepCount} Steps Completed`);
    setFeedback(`Begin by selecting: "${targetSequence[0]?.label}".`, 'info');

    // Click handler for sequence buttons
    actionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isResolved) return;
        const clickedId = btn.getAttribute('data-step-id');
        const expectedStep = targetSequence[currentStepIndex];

        if (clickedId === expectedStep.id) {
          // Correct step picked!
          btn.classList.add('step-completed');
          btn.disabled = true;

          // Update timeline node
          if (timelineNodes[currentStepIndex]) {
            timelineNodes[currentStepIndex].classList.remove('current');
            timelineNodes[currentStepIndex].classList.add('completed');
          }

          currentStepIndex++;
          const pct = Math.round((currentStepIndex / stepCount) * 100);
          setProgress(pct, `${currentStepIndex}/${stepCount} Steps`);

          if (currentStepIndex < stepCount) {
            const nextStep = targetSequence[currentStepIndex];
            if (timelineNodes[currentStepIndex]) {
              timelineNodes[currentStepIndex].classList.add('current');
            }
            if (targetBadge) {
              targetBadge.innerHTML = `Current Goal: <strong>${nextStep.label}</strong>`;
            }
            setFeedback(`Good progress! Next step: "${nextStep.label}".`, 'success');
          } else {
            // All steps completed!
            isResolved = true;
            if (targetBadge) {
              targetBadge.innerHTML = `Current Goal: <strong>DONE!</strong>`;
            }

            const score = Number(Math.max(0.60, 1.0 - (mistakes * 0.15)).toFixed(3));
            const qualityTier = getQualityTier(score);
            setFeedback(`Procedure completed successfully! Quality: ${qualityTier.toUpperCase()}.`, 'success');

            setTimeout(() => {
              onSubmit({
                outcome: 'success',
                score,
                qualityTier,
                gameMinutesSpent,
                rewardId: createRewardId(activityType, `seq_${Date.now()}`),
                metadata: {
                  stepsCompleted: stepCount,
                  mistakes,
                },
              });
            }, 600);
          }
        } else {
          // Incorrect step picked!
          mistakes++;
          const remainingErrors = Math.max(0, allowedMistakes - mistakes);
          if (faultBadge) {
            faultBadge.innerHTML = `Allowed Errors: <strong>${remainingErrors}</strong>`;
          }

          btn.classList.add('error-shake');
          setTimeout(() => btn.classList.remove('error-shake'), 450);

          if (mistakes >= allowedMistakes) {
            // Over allowed mistakes: failed attempt
            isResolved = true;
            setFeedback(`Procedure ruined! Order of operations was compromised.`, 'danger');
            setProgress(Math.round((currentStepIndex / stepCount) * 100), 'Failed');

            setTimeout(() => {
              onSubmit({
                outcome: 'failure',
                score: 0.30,
                qualityTier: 'poor',
                gameMinutesSpent,
                rewardId: createRewardId(activityType, `seq_fail_${Date.now()}`),
                metadata: {
                  stepsCompleted: currentStepIndex,
                  mistakes,
                },
              });
            }, 600);
          } else {
            setFeedback(`Out of order! Needed "${expectedStep.label}" first. ${remainingErrors} error allowance remaining.`, 'danger');
          }
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
