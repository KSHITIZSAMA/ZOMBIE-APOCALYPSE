import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateMiniGameResult, getQualityTier, createRewardId } from '../src/minigames/contracts.js';
import { DifficultySystem, DIFFICULTY_LIMITS } from '../src/minigames/DifficultySystem.js';
import { RewardProcessor } from '../src/minigames/RewardProcessor.js';
import { MiniGameManager } from '../src/minigames/MiniGameManager.js';
import { Inventory } from '../src/core/Inventory.js';
import { ClockSystem } from '../src/core/ClockSystem.js';
import { NeedsSystem } from '../src/core/NeedsSystem.js';
import { FarmingSystem } from '../src/core/FarmingSystem.js';
import { SaveSystem } from '../src/core/SaveSystem.js';

describe('Stage 1 — Mini-Game Framework', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    globalThis.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };
  });

  describe('1. Result Contract & Quality Tiers', () => {
    it('correctly maps scores to quality tiers', () => {
      expect(getQualityTier(0.95)).toBe('master');
      expect(getQualityTier(0.90)).toBe('master');
      expect(getQualityTier(0.85)).toBe('good');
      expect(getQualityTier(0.70)).toBe('good');
      expect(getQualityTier(0.55)).toBe('standard');
      expect(getQualityTier(0.40)).toBe('standard');
      expect(getQualityTier(0.20)).toBe('poor');
      expect(getQualityTier(0.0)).toBe('poor');
    });

    it('validates a well-formed mini-game result', () => {
      const validResult = {
        outcome: 'success',
        score: 0.82,
        qualityTier: 'good',
        gameMinutesSpent: 15,
        rewardId: 'harvest_plot_0_test1',
        metadata: { plotIndex: 0 },
      };
      const validation = validateMiniGameResult(validResult);
      expect(validation.valid).toBe(true);
      expect(validation.sanitized?.outcome).toBe('success');
      expect(validation.sanitized?.rewardId).toBe('harvest_plot_0_test1');
    });

    it('rejects invalid outcomes, scores, and missing reward IDs', () => {
      expect(validateMiniGameResult(null).valid).toBe(false);
      expect(validateMiniGameResult({ outcome: 'unknown', score: 0.5, qualityTier: 'standard', gameMinutesSpent: 10, rewardId: 'r1' }).valid).toBe(false);
      expect(validateMiniGameResult({ outcome: 'success', score: 1.5, qualityTier: 'master', gameMinutesSpent: 10, rewardId: 'r1' }).valid).toBe(false);
      expect(validateMiniGameResult({ outcome: 'success', score: -0.1, qualityTier: 'poor', gameMinutesSpent: 10, rewardId: 'r1' }).valid).toBe(false);
      expect(validateMiniGameResult({ outcome: 'success', score: 0.8, qualityTier: 'invalid_tier', gameMinutesSpent: 10, rewardId: 'r1' }).valid).toBe(false);
      expect(validateMiniGameResult({ outcome: 'success', score: 0.8, qualityTier: 'good', gameMinutesSpent: -5, rewardId: 'r1' }).valid).toBe(false);
      expect(validateMiniGameResult({ outcome: 'success', score: 0.8, qualityTier: 'good', gameMinutesSpent: 10, rewardId: '' }).valid).toBe(false);
    });

    it('generates clean unique reward IDs with disambiguators', () => {
      const id1 = createRewardId('harvest', 'plot_0');
      const id2 = createRewardId('circuit_repair', 42);
      expect(id1).toBe('reward_harvest_plot_0');
      expect(id2).toBe('reward_circuit_repair_42');
    });
  });

  describe('2. Centralized Difficulty & Parameter Derivation', () => {
    it('calculates effective difficulty considering skills, tools, fatigue, and traits', () => {
      const easyCalc = DifficultySystem.calculateDifficulty({
        baseDifficulty: 0.5,
        skillLevel: 50, // -0.15
        toolBonus: 0.10, // -0.10
        fatigue: 20, // 0 penalty
        traits: ['green_thumb'], // -0.08
        assistedMode: false,
      });

      // 0.5 - 0.15 - 0.10 - 0.08 = 0.17
      expect(easyCalc.effectiveDifficulty).toBeCloseTo(0.17, 2);
      expect(easyCalc.effectiveDifficulty).toBeGreaterThanOrEqual(DIFFICULTY_LIMITS.MIN);
    });

    it('applies fatigue penalties and traits correctly without making it impossible', () => {
      const hardCalc = DifficultySystem.calculateDifficulty({
        baseDifficulty: 0.8,
        skillLevel: 0,
        toolBonus: 0,
        fatigue: 90, // ((90-50)/50)*0.20 = +0.16
        traits: ['paranoid', 'frail'], // +0.05 + 0.08 = +0.13
        assistedMode: false,
      });

      // 0.8 + 0.16 + 0.13 = 1.09 -> strictly clamped to MAX limit 0.85
      expect(hardCalc.effectiveDifficulty).toBe(DIFFICULTY_LIMITS.MAX);
    });

    it('assisted mode provides handicap reduction and clamps at minimum', () => {
      const assistedCalc = DifficultySystem.calculateDifficulty({
        baseDifficulty: 0.4,
        skillLevel: 60,
        toolBonus: 0.1,
        assistedMode: true, // -0.25
      });

      expect(assistedCalc.effectiveDifficulty).toBe(DIFFICULTY_LIMITS.MIN);
    });

    it('derives mechanic-specific parameters for each of the 5 templates', () => {
      const timingParams = DifficultySystem.deriveParameters('timing_bar', 0.25);
      expect(timingParams.targetZoneWidth).toBeGreaterThan(25);
      expect(timingParams.indicatorSpeed).toBeLessThan(350);
      expect(timingParams.attempts).toBeGreaterThanOrEqual(2);

      const sequenceParams = DifficultySystem.deriveParameters('ordered_sequence', 0.50);
      expect(sequenceParams.stepCount).toBeGreaterThanOrEqual(3);
      expect(sequenceParams.allowedMistakes).toBeGreaterThanOrEqual(1);

      const gridParams = DifficultySystem.deriveParameters('grid_selection', 0.65);
      expect(gridParams.gridSize).toBeGreaterThanOrEqual(4);
      expect(gridParams.targetCount).toBeGreaterThanOrEqual(3);

      const connectParams = DifficultySystem.deriveParameters('connect_match', 0.40);
      expect(connectParams.pairCount).toBeGreaterThanOrEqual(3);

      const packParams = DifficultySystem.deriveParameters('pack_fit', 0.50);
      expect(packParams.containerCapacity).toBeGreaterThan(8);
      expect(packParams.itemCount).toBeGreaterThan(4);
    });
  });

  describe('3. Transactional Reward Processing & Reservations', () => {
    let processor;
    let inventory;
    let mockGame;

    beforeEach(() => {
      processor = new RewardProcessor();
      inventory = new Inventory(10);
      inventory.addItem('wood', 5);
      inventory.addItem('water_bottle', 2);

      mockGame = {
        inventory,
        money: 100,
        clock: new ClockSystem(),
        needs: new NeedsSystem(),
        farmingSystem: new FarmingSystem(),
        player: {
          traits: [],
          skills: { farming: 10 },
        },
        _updateHUD: vi.fn(),
      };
    });

    it('reserves materials and rejects activity if materials are insufficient', () => {
      const resPass = processor.reserveMaterials('tx_1', inventory, [{ itemId: 'wood', count: 3 }]);
      expect(resPass.success).toBe(true);
      // Materials still in inventory before completion
      expect(inventory.hasItem('wood', 5)).toBe(true);

      const resFail = processor.reserveMaterials('tx_2', inventory, [{ itemId: 'wood', count: 10 }]);
      expect(resFail.success).toBe(false);
      expect(resFail.error).toContain('Insufficient materials');
    });

    it('cancels activity without consuming resources or charging time', () => {
      processor.reserveMaterials('tx_cancel', inventory, [{ itemId: 'wood', count: 2 }]);
      const cancelRes = processor.cancelActivity('tx_cancel');

      expect(cancelRes.cancelled).toBe(true);
      expect(inventory.hasItem('wood', 5)).toBe(true);
      expect(mockGame.clock.minute).toBe(0);
      expect(mockGame.money).toBe(100);
    });

    it('completes transaction atomically on success: consumes materials, advances clock, grants rewards', () => {
      processor.reserveMaterials('tx_success', inventory, [{ itemId: 'wood', count: 2 }]);

      const result = {
        outcome: 'success',
        score: 0.85,
        qualityTier: 'good',
        gameMinutesSpent: 20,
        rewardId: 'wood_craft_reward_01',
      };

      const rewardDef = {
        money: 50,
        items: [{ itemId: 'bread', count: 2 }],
        skillExp: { skillName: 'farming', exp: 15 },
      };

      const receipt = processor.processResult(mockGame, 'tx_success', result, rewardDef);

      expect(receipt.success).toBe(true);
      expect(receipt.outcome).toBe('success');
      // Consumed 2 wood -> 3 remaining
      expect(inventory.getItemCount('wood')).toBe(3);
      // Granted bread
      expect(inventory.hasItem('bread', 2)).toBe(true);
      // Granted money with quality tier multiplier (good tier 1.1x: 50 * 1.1 = 55)
      expect(mockGame.money).toBe(155);
      // Clock advanced by 20 game minutes
      expect(mockGame.clock.minute).toBe(20);
      // Skill exp granted
      expect(mockGame.player.skills.farming).toBeGreaterThan(10);
      // Recorded in processed reward IDs
      expect(processor.hasRewardBeenProcessed('wood_craft_reward_01')).toBe(true);
    });

    it('strictly prevents duplicate reward exploitation with same rewardId', () => {
      const result = {
        outcome: 'success',
        score: 0.8,
        qualityTier: 'good',
        gameMinutesSpent: 10,
        rewardId: 'unique_harvest_001',
      };

      const firstReceipt = processor.processResult(mockGame, 'tx_dup1', result, { money: 100 });
      expect(firstReceipt.success).toBe(true);
      expect(mockGame.money).toBe(210);

      // Attempting to submit again with same rewardId must be rejected
      const secondReceipt = processor.processResult(mockGame, 'tx_dup2', result, { money: 100 });
      expect(secondReceipt.success).toBe(false);
      expect(secondReceipt.error).toContain('Duplicate reward rejected');
      expect(mockGame.money).toBe(210); // Unchanged
    });
  });

  describe('4. MiniGameManager Orchestration & Quick Work', () => {
    let game;
    let manager;

    beforeEach(() => {
      const inventory = new Inventory(10);
      inventory.addItem('wood', 4);

      game = {
        inventory,
        money: 200,
        clock: new ClockSystem(),
        needs: new NeedsSystem(),
        farmingSystem: new FarmingSystem(),
        player: { traits: [], skills: { crafting: 35 } },
        _container: null, // headless
        _updateHUD: vi.fn(),
      };

      manager = new MiniGameManager(game);
    });

    it('launches activity, pauses clock, reserves materials, and derives parameters', () => {
      const launchRes = manager.launchActivity({
        type: 'timber_cut',
        mechanic: 'timing_bar',
        title: 'Timber Cutting',
        instructions: 'Press SPACE when indicator enters green zone.',
        baseDifficulty: 0.5,
        skillLevel: 20,
        gameMinutesSpent: 15,
        requiredMaterials: [{ itemId: 'wood', count: 1 }],
      });

      expect(launchRes.success).toBe(true);
      expect(game.clock.paused).toBe(true);
      expect(manager.activeActivity).not.toBeNull();
      expect(launchRes.derivedParams.targetZoneWidth).toBeDefined();
    });

    it('cancels active activity cleanly and resumes clock', () => {
      manager.launchActivity({
        type: 'test_act',
        mechanic: 'timing_bar',
        title: 'Test',
        instructions: 'Test',
        requiredMaterials: [{ itemId: 'wood', count: 1 }],
      });

      const cancelRes = manager.cancelActiveActivity();
      expect(cancelRes.cancelled).toBe(true);
      expect(game.clock.paused).toBe(false);
      expect(manager.activeActivity).toBeNull();
      expect(game.inventory.getItemCount('wood')).toBe(4); // Untouched
    });

    it('submits valid result, resumes clock, updates mastery count and rewards', () => {
      manager.launchActivity({
        type: 'wood_chop',
        mechanic: 'timing_bar',
        title: 'Chop Wood',
        instructions: 'Chop',
        gameMinutesSpent: 12,
        requiredMaterials: [{ itemId: 'wood', count: 2 }],
        rewardDefinition: { money: 30 },
      });

      const result = {
        outcome: 'success',
        score: 0.88,
        qualityTier: 'good',
        gameMinutesSpent: 12,
        rewardId: 'wood_chop_receipt_1',
      };

      const receipt = manager.submitResult(result);
      expect(receipt.success).toBe(true);
      expect(game.clock.paused).toBe(false);
      expect(game.inventory.getItemCount('wood')).toBe(2);
      expect(manager.getMasteryCount('wood_chop')).toBe(1);
    });

    it('executes mastery-based Quick Work without opening the mini-game puzzle', () => {
      // Crafting skill is 35 (>= 30), so Quick Work is available
      expect(manager.isQuickWorkAvailable('carpentry', 35)).toBe(true);

      const quickReceipt = manager.executeQuickWork({
        type: 'carpentry',
        gameMinutesSpent: 15,
        requiredMaterials: [{ itemId: 'wood', count: 1 }],
        rewardDefinition: { money: 40 },
      });

      expect(quickReceipt.success).toBe(true);
      expect(quickReceipt.qualityTier).toBe('good');
      expect(game.inventory.getItemCount('wood')).toBe(3); // 1 consumed
      expect(game.money).toBeGreaterThan(200);
      expect(manager.getMasteryCount('carpentry')).toBe(1);
    });

    it('serializes and restores processed reward IDs, mastery, and assisted mode via SaveSystem', () => {
      manager.setAssistedMode(true);
      manager.activityMastery.set('harvest', 5);
      manager.rewardProcessor.processedRewardIds.add('saved_reward_id_99');

      const serialized = manager.serialize();
      expect(serialized.assistedMode).toBe(true);
      expect(serialized.mastery.harvest).toBe(5);
      expect(serialized.processedRewardIds).toContain('saved_reward_id_99');

      const newManager = new MiniGameManager(game);
      newManager.deserialize(serialized);

      expect(newManager.assistedMode).toBe(true);
      expect(newManager.getMasteryCount('harvest')).toBe(5);
      expect(newManager.rewardProcessor.hasRewardBeenProcessed('saved_reward_id_99')).toBe(true);
    });
  });
});
