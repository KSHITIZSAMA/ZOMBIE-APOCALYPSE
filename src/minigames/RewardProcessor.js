/**
 * RewardProcessor.js — Centralized transactional reward validation and application.
 * Enforces atomic mini-game completions:
 * - Material reservations before completion
 * - Rollback on cancellation
 * - Clock advancement through authoritative clock
 * - Chronological event protection
 * - Strict duplicate prevention via unique reward IDs
 */

import { validateMiniGameResult } from './contracts.js';

export class RewardProcessor {
  constructor() {
    /** @type {Set<string>} Track processed reward IDs to prevent duplicates */
    this.processedRewardIds = new Set();

    /** @type {Map<string, { materials: Array<{ itemId: string, count: number }>, inventory: object }>} Active material reservations */
    this.activeReservations = new Map();
  }

  /**
   * Check if a reward ID has already been claimed.
   * @param {string} rewardId
   * @returns {boolean}
   */
  hasRewardBeenProcessed(rewardId) {
    if (!rewardId) return false;
    return this.processedRewardIds.has(String(rewardId).trim());
  }

  /**
   * Begin transactional material reservation.
   * Verifies that the player has sufficient materials without permanently consuming them yet.
   * @param {string} transactionId - Unique activity instance ID.
   * @param {import('../core/Inventory.js').Inventory} inventory - Player inventory.
   * @param {Array<{ itemId: string, count: number }>} [requiredMaterials=[]] - Materials to reserve.
   * @returns {{ success: boolean, error?: string }}
   */
  reserveMaterials(transactionId, inventory, requiredMaterials = []) {
    if (!transactionId) {
      return { success: false, error: 'Transaction ID is required for reservation.' };
    }

    if (!Array.isArray(requiredMaterials) || requiredMaterials.length === 0) {
      this.activeReservations.set(transactionId, { materials: [], inventory });
      return { success: true };
    }

    // Verify all materials are currently in inventory
    for (const req of requiredMaterials) {
      if (!req.itemId || req.count <= 0) continue;
      if (!inventory.hasItem(req.itemId, req.count)) {
        return {
          success: false,
          error: `Insufficient materials: requires ${req.count}x ${req.itemId}.`,
        };
      }
    }

    this.activeReservations.set(transactionId, {
      materials: requiredMaterials.map((r) => ({ itemId: r.itemId, count: r.count })),
      inventory,
    });

    return { success: true };
  }

  /**
   * Cancel transaction: Release all reserved materials without consuming them,
   * without advancing game time, and without granting rewards.
   * @param {string} transactionId
   * @returns {{ cancelled: boolean, message: string }}
   */
  cancelActivity(transactionId) {
    if (this.activeReservations.has(transactionId)) {
      this.activeReservations.delete(transactionId);
    }
    return {
      cancelled: true,
      message: 'Activity cancelled. No resources consumed and no time elapsed.',
    };
  }

  /**
   * Process and validate a completed mini-game result transaction.
   * Executes atomic updates: Clock -> Events -> Needs -> Materials -> Rewards -> Completion Record.
   * @param {object} game - Main Game orchestrator instance.
   * @param {string} transactionId - Active transaction ID.
   * @param {import('./contracts.js').MiniGameResult} result - Mini-game result contract.
   * @param {object} [rewardDefinition={}] - Configured reward specification.
   * @param {number} [rewardDefinition.money=0] - Base money payout.
   * @param {Array<{ itemId: string, count: number }>} [rewardDefinition.items=[]] - Item rewards.
   * @param {{ skillName: string, exp: number }} [rewardDefinition.skillExp] - Skill experience.
   * @returns {{
   *   success: boolean,
   *   error?: string,
   *   outcome: string,
   *   qualityTier?: string,
   *   gameMinutesSpent?: number,
   *   consumedMaterials?: Array<{ itemId: string, count: number }>,
   *   grantedRewards?: { money: number, items: Array<{ itemId: string, count: number }>, skillExp?: any }
   * }}
   */
  processResult(game, transactionId, result, rewardDefinition = {}) {
    // 1. Validate result contract
    const validation = validateMiniGameResult(result);
    if (!validation.valid || !validation.sanitized) {
      this.cancelActivity(transactionId);
      return { success: false, error: `Invalid result contract: ${validation.error}`, outcome: 'failure' };
    }

    const res = validation.sanitized;

    // Handle cancellation outcome
    if (res.outcome === 'cancelled') {
      this.cancelActivity(transactionId);
      return { success: true, outcome: 'cancelled', message: 'Activity was cancelled by player.' };
    }

    // 2. Prevent duplicate reward exploitation
    if (this.hasRewardBeenProcessed(res.rewardId)) {
      this.cancelActivity(transactionId);
      return {
        success: false,
        error: `Duplicate reward rejected: "${res.rewardId}" has already been processed.`,
        outcome: 'failure',
      };
    }

    // 3. Validate reserved materials are still available in inventory
    const reservation = this.activeReservations.get(transactionId);
    const materialsToConsume = reservation ? reservation.materials : [];

    if (game.inventory && materialsToConsume.length > 0) {
      for (const mat of materialsToConsume) {
        if (!game.inventory.hasItem(mat.itemId, mat.count)) {
          this.cancelActivity(transactionId);
          return {
            success: false,
            error: `Transaction failed: Reserved material ${mat.itemId} is no longer in inventory.`,
            outcome: 'failure',
          };
        }
      }
    }

    // 4. Advance Authoritative Game Clock & Process Chronological Events
    const minutesToAdvance = res.gameMinutesSpent || 0;
    const hoursToAdvance = minutesToAdvance / 60;

    if (minutesToAdvance > 0 && game.clock) {
      // Check if scheduled event falls within this activity interval
      if (game.eventManager && hoursToAdvance > 0) {
        const pendingEvent = game.eventManager.findEventInInterval(
          game.clock.day,
          game.clock.hour,
          hoursToAdvance
        );

        if (pendingEvent) {
          // Advance clock up to the scheduled event to ensure chronological ordering
          game.clock.advanceHours(pendingEvent.hoursUntilEvent);
          if (game.needs) {
            game.needs.advanceHours(pendingEvent.hoursUntilEvent, game.player?.traits || []);
          }
          if (game.farmingSystem) {
            game.farmingSystem.advanceHours(pendingEvent.hoursUntilEvent);
          }
          // Trigger the pending event
          if (typeof game.triggerEvent === 'function') {
            game.triggerEvent(pendingEvent.event.id);
          }
        } else {
          game.clock.advanceByGameMinutes(minutesToAdvance);
          if (game.needs) {
            game.needs.advanceHours(hoursToAdvance, game.player?.traits || []);
          }
          if (game.farmingSystem) {
            game.farmingSystem.advanceHours(hoursToAdvance);
          }
        }
      } else {
        game.clock.advanceByGameMinutes(minutesToAdvance);
        if (game.needs) {
          game.needs.advanceHours(hoursToAdvance, game.player?.traits || []);
        }
        if (game.farmingSystem) {
          game.farmingSystem.advanceHours(hoursToAdvance);
        }
      }
    }

    // 5. Consume Reserved Materials
    const consumedMaterials = [];
    if (game.inventory && materialsToConsume.length > 0) {
      for (const mat of materialsToConsume) {
        const removed = game.inventory.removeItem(mat.itemId, mat.count);
        if (removed) {
          consumedMaterials.push({ itemId: mat.itemId, count: mat.count });
        }
      }
    }
    this.activeReservations.delete(transactionId);

    // If outcome was failure, no rewards are granted, but time & materials may be applied
    if (res.outcome === 'failure') {
      this.processedRewardIds.add(res.rewardId);
      return {
        success: true,
        outcome: 'failure',
        qualityTier: res.qualityTier,
        gameMinutesSpent: minutesToAdvance,
        consumedMaterials,
        grantedRewards: { money: 0, items: [] },
      };
    }

    // 6. Calculate Quality Tier Multiplier & Grant Rewards
    // Quality tiers scale yields and monetary rewards
    let tierMultiplier = 1.0;
    if (res.qualityTier === 'master') tierMultiplier = 1.30;
    else if (res.qualityTier === 'good') tierMultiplier = 1.10;
    else if (res.qualityTier === 'standard') tierMultiplier = 1.0;
    else if (res.qualityTier === 'poor') tierMultiplier = 0.60;

    // Grant Money
    let grantedMoney = 0;
    if (rewardDefinition.money && rewardDefinition.money > 0) {
      grantedMoney = Math.round(rewardDefinition.money * tierMultiplier);
      game.money = (game.money || 0) + grantedMoney;
      if (game.sound) game.sound.playCash();
    }

    // Grant Items
    const grantedItems = [];
    if (Array.isArray(rewardDefinition.items) && game.inventory) {
      for (const itemDef of rewardDefinition.items) {
        if (!itemDef.itemId || itemDef.count <= 0) continue;
        let count = Math.round(itemDef.count * tierMultiplier);
        if (count < 1 && itemDef.count > 0 && res.qualityTier !== 'poor') count = 1;

        if (count > 0) {
          game.inventory.addItem(itemDef.itemId, count);
          grantedItems.push({ itemId: itemDef.itemId, count });
        }
      }
    }

    // Grant Skill / Occupation Experience
    let grantedSkill = null;
    if (rewardDefinition.skillExp && game.player) {
      const { skillName, exp } = rewardDefinition.skillExp;
      if (skillName && exp > 0) {
        const bonusExp = Math.round(exp * tierMultiplier);
        if (!game.player.skills) game.player.skills = {};
        game.player.skills[skillName] = Math.min(100, (game.player.skills[skillName] || 0) + bonusExp);
        grantedSkill = { skillName, exp: bonusExp, current: game.player.skills[skillName] };
      }
    }

    // 7. Record Completion ID
    this.processedRewardIds.add(res.rewardId);

    if (typeof game._updateHUD === 'function') {
      game._updateHUD();
    }

    return {
      success: true,
      outcome: 'success',
      rewardId: res.rewardId,
      qualityTier: res.qualityTier,
      gameMinutesSpent: minutesToAdvance,
      consumedMaterials,
      grantedRewards: {
        money: grantedMoney,
        items: grantedItems,
        skillExp: grantedSkill,
      },
    };
  }

  /**
   * Serialize processed reward IDs for persistent SaveSystem integration.
   * @returns {Array<string>}
   */
  serialize() {
    return Array.from(this.processedRewardIds);
  }

  /**
   * Restore processed reward IDs from save state.
   * @param {Array<string>} savedIds
   */
  deserialize(savedIds) {
    this.processedRewardIds.clear();
    this.activeReservations.clear();
    if (Array.isArray(savedIds)) {
      for (const id of savedIds) {
        if (typeof id === 'string') {
          this.processedRewardIds.add(id);
        }
      }
    }
  }
}
