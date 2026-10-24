/**
 * MiniGameManager.js — Central orchestrator for the modular mini-game system.
 * Coordinates difficulty calculation, material reservations, transactional reward
 * processing, overlay mounting, assisted mode, and mastery-based quick work.
 */

import { RewardProcessor } from './RewardProcessor.js';
import { DifficultySystem } from './DifficultySystem.js';
import { MiniGameOverlay } from './MiniGameOverlay.js';
import { createRewardId } from './contracts.js';

export class MiniGameManager {
  /**
   * @param {object} game - Main Game orchestrator instance.
   */
  constructor(game) {
    this.game = game;
    this.rewardProcessor = new RewardProcessor();

    /** @type {boolean} Accessibility assisted mode */
    this.assistedMode = false;
    try {
      if (typeof localStorage !== 'undefined') {
        this.assistedMode = localStorage.getItem('before_the_dead_assisted_mode') === 'true';
      }
    } catch {}

    /** @type {Map<string, number>} Activity type -> completion count for mastery */
    this.activityMastery = new Map();

    /** @type {object|null} Currently active mini-game instance state */
    this.activeActivity = null;

    /** @type {MiniGameOverlay|null} */
    this.activeOverlay = null;
  }

  /**
   * Check or toggle assisted mode.
   * @param {boolean} [enabled]
   * @returns {boolean}
   */
  setAssistedMode(enabled) {
    this.assistedMode = Boolean(enabled);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('before_the_dead_assisted_mode', String(this.assistedMode));
      }
    } catch {}
    return this.assistedMode;
  }

  /**
   * Get completion count for an activity.
   * @param {string} activityType
   * @returns {number}
   */
  getMasteryCount(activityType) {
    return this.activityMastery.get(activityType) || 0;
  }

  /**
   * Check if Quick Work is unlocked for an activity.
   * Quick Work is unlocked when player has completed the activity at least 3 times
   * OR relevant skill level is at least 30.
   * @param {string} activityType
   * @param {number} [skillLevel=0]
   * @returns {boolean}
   */
  isQuickWorkAvailable(activityType, skillLevel = 0) {
    const completions = this.getMasteryCount(activityType);
    return completions >= 3 || skillLevel >= 30;
  }

  /**
   * Launch a mini-game activity.
   * Pauses the main game clock, reserves required materials, calculates effective
   * difficulty, and opens the overlay.
   * @param {object} config
   * @param {string} config.type - Activity identifier (e.g. 'harvest', 'circuit_repair').
   * @param {'timing_bar'|'ordered_sequence'|'grid_selection'|'connect_match'|'pack_fit'} config.mechanic
   * @param {string} config.title - Display title.
   * @param {string} [config.subtitle] - Display category/occupation tag.
   * @param {string} config.instructions - Gameplay instructions.
   * @param {number} [config.baseDifficulty=0.5] - Base activity difficulty (0.1 - 0.9).
   * @param {number} [config.skillLevel=0] - Relevant player skill (0 - 100).
   * @param {number} [config.toolBonus=0] - Tool quality deduction.
   * @param {number} [config.gameMinutesSpent=15] - Expected game minutes.
   * @param {Array<{ itemId: string, count: number }>} [config.requiredMaterials=[]] - Input materials.
   * @param {object} [config.rewardDefinition={}] - Rewards to grant on success.
   * @param {Function} [launchTemplateCallback] - Function(stageElement, derivedParams, submitFn, cancelFn)
   * @returns {{ success: boolean, transactionId?: string, error?: string }}
   */
  launchActivity(config, launchTemplateCallback = null) {
    if (this.activeActivity) {
      return { success: false, error: 'Another mini-game activity is already in progress.' };
    }

    const transactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 1. Transactional Material Reservation
    const reservationRes = this.rewardProcessor.reserveMaterials(
      transactionId,
      this.game.inventory,
      config.requiredMaterials || []
    );

    if (!reservationRes.success) {
      return { success: false, error: reservationRes.error };
    }

    // 2. Centralized Difficulty Calculation
    const fatigue = this.game.needs ? this.game.needs.fatigue : 0;
    const traits = this.game.player ? this.game.player.traits : [];
    const diffCalc = DifficultySystem.calculateDifficulty({
      baseDifficulty: config.baseDifficulty ?? 0.5,
      skillLevel: config.skillLevel || 0,
      toolBonus: config.toolBonus || 0,
      fatigue,
      traits,
      assistedMode: this.assistedMode,
    });

    const derivedParams = DifficultySystem.deriveParameters(config.mechanic, diffCalc.effectiveDifficulty);

    // 3. Pause authoritative world clock during mini-game
    if (this.game.clock) {
      this.game.clock.pause();
    }

    const quickWorkAvailable = this.isQuickWorkAvailable(config.type, config.skillLevel || 0);

    // 4. Record active activity state
    this.activeActivity = {
      ...config,
      transactionId,
      effectiveDifficulty: diffCalc.effectiveDifficulty,
      derivedParams,
      gameMinutesSpent: config.gameMinutesSpent || 15,
      quickWorkAvailable,
    };

    // 5. Mount Reusable Overlay if parent container is present
    const container = this.game._container || (typeof document !== 'undefined' ? document.getElementById('game-container') : null);
    if (container) {
      this.activeOverlay = new MiniGameOverlay(container, {
        title: config.title,
        subtitle: config.subtitle,
        instructions: config.instructions,
        assistedMode: this.assistedMode,
        quickWorkAvailable,
        onAssistedToggle: (enabled) => {
          this.setAssistedMode(enabled);
          // Recalculate difficulty if callback provided
        },
        onQuickWork: () => {
          this.executeQuickWork(config, transactionId);
        },
        onCancel: () => {
          this.cancelActiveActivity();
        },
      });

      this.activeOverlay.mount();

      // Launch mechanic template if callback provided
      if (typeof launchTemplateCallback === 'function') {
        launchTemplateCallback(
          this.activeOverlay.getStageElement(),
          derivedParams,
          (result) => this.submitResult(result),
          () => this.cancelActiveActivity()
        );
      }
    }

    return {
      success: true,
      transactionId,
      effectiveDifficulty: diffCalc.effectiveDifficulty,
      derivedParams,
    };
  }

  /**
   * Execute mastery-based Quick Work without launching or playing the puzzle.
   * Produces a standard/good tier result with standard resource consumption and time elapsed.
   * @param {object} config - Activity configuration.
   * @param {string} [transactionId] - Optional existing transaction ID.
   * @returns {object} Transaction receipt.
   */
  executeQuickWork(config, transactionId = null) {
    const txnId = transactionId || `txn_qw_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    if (!transactionId) {
      const res = this.rewardProcessor.reserveMaterials(
        txnId,
        this.game.inventory,
        config.requiredMaterials || []
      );
      if (!res.success) {
        return { success: false, error: res.error, outcome: 'failure' };
      }
    }

    // Unmount overlay if open
    if (this.activeOverlay) {
      this.activeOverlay.unmount();
      this.activeOverlay = null;
    }

    // Resume clock
    if (this.game.clock) {
      this.game.clock.resume();
    }

    // Standard simulated mastery result
    const result = {
      outcome: 'success',
      score: 0.75,
      qualityTier: 'good',
      gameMinutesSpent: config.gameMinutesSpent || 15,
      rewardId: createRewardId(config.type, txnId),
    };

    const receipt = this.rewardProcessor.processResult(
      this.game,
      txnId,
      result,
      config.rewardDefinition || {}
    );

    if (receipt.success && receipt.outcome === 'success') {
      const current = this.activityMastery.get(config.type) || 0;
      this.activityMastery.set(config.type, current + 1);
    }

    this.activeActivity = null;
    return receipt;
  }

  /**
   * Submit completed mini-game result to the central reward processor.
   * @param {import('./contracts.js').MiniGameResult} result
   * @returns {object} Transaction receipt.
   */
  submitResult(result) {
    if (!this.activeActivity) {
      return { success: false, error: 'No active mini-game activity to complete.', outcome: 'failure' };
    }

    const { transactionId, type, rewardDefinition } = this.activeActivity;

    // Unmount overlay
    if (this.activeOverlay) {
      this.activeOverlay.unmount();
      this.activeOverlay = null;
    }

    // Resume game clock
    if (this.game.clock) {
      this.game.clock.resume();
    }

    const receipt = this.rewardProcessor.processResult(
      this.game,
      transactionId,
      result,
      rewardDefinition || {}
    );

    if (receipt.success && receipt.outcome === 'success') {
      const current = this.activityMastery.get(type) || 0;
      this.activityMastery.set(type, current + 1);
    }

    this.activeActivity = null;
    return receipt;
  }

  /**
   * Cancel the currently active mini-game activity.
   * Releases all reserved materials, resumes clock, and guarantees zero penalties.
   * @returns {{ cancelled: boolean, message: string }}
   */
  cancelActiveActivity() {
    if (!this.activeActivity) {
      return { cancelled: true, message: 'No active activity.' };
    }

    const { transactionId } = this.activeActivity;

    if (this.activeOverlay) {
      this.activeOverlay.unmount();
      this.activeOverlay = null;
    }

    if (this.game.clock) {
      this.game.clock.resume();
    }

    const cancelRes = this.rewardProcessor.cancelActivity(transactionId);
    this.activeActivity = null;
    return cancelRes;
  }

  /**
   * Serialize mini-game system state for SaveSystem persistence.
   * @returns {object}
   */
  serialize() {
    return {
      processedRewardIds: this.rewardProcessor.serialize(),
      mastery: Object.fromEntries(this.activityMastery.entries()),
      assistedMode: this.assistedMode,
    };
  }

  /**
   * Restore mini-game system state from save file.
   * @param {object} data
   */
  deserialize(data) {
    if (!data || typeof data !== 'object') return;

    if (Array.isArray(data.processedRewardIds)) {
      this.rewardProcessor.deserialize(data.processedRewardIds);
    }

    this.activityMastery.clear();
    if (data.mastery && typeof data.mastery === 'object') {
      for (const [type, count] of Object.entries(data.mastery)) {
        if (typeof count === 'number') {
          this.activityMastery.set(type, count);
        }
      }
    }

    if (typeof data.assistedMode === 'boolean') {
      this.setAssistedMode(data.assistedMode);
    }
  }
}
