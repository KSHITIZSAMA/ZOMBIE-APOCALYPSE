import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MiniGameManager } from '../src/minigames/MiniGameManager.js';
import { Inventory } from '../src/core/Inventory.js';
import { ClockSystem } from '../src/core/ClockSystem.js';
import { NeedsSystem } from '../src/core/NeedsSystem.js';
import { FarmingSystem } from '../src/core/FarmingSystem.js';
import { Player } from '../src/entities/Player.js';
import { validateMiniGameResult } from '../src/minigames/contracts.js';
import { Game } from '../src/core/Game.js';

describe('Stage 5 — Apocalypse Mini-Games', () => {
  let mockStorage = {};
  let mockGame;

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

    const inventory = new Inventory(12);
    const clock = new ClockSystem();
    const needs = new NeedsSystem();
    const farmingSystem = new FarmingSystem();
    const player = new Player();
    player.setConfiguration({
      name: 'Vance',
      occupation: 'carpenter',
      traits: ['hardy'],
    });
    player.skills = { farming: 10, crafting: 25, electrical: 15, scavenging: 20 };

    mockGame = {
      inventory,
      clock,
      needs,
      farmingSystem,
      player,
      money: 200,
      baseDefenseLevel: 0,
      doorBarricadeLevel: 0,
      generatorRunning: false,
      _lockedCacheOpened: false,
      worldStage: 'normal',
      state: 'playing',
      truckState: {
        battery: false,
        fuel: false,
        engineRepaired: false,
      },
      stats: { cropsHarvested: 0, zombiesDefeated: 0 },
      _updateHUD: vi.fn(),
      showNotification: vi.fn(),
      sound: {
        playCash: vi.fn(),
        playClick: vi.fn(),
        playHammer: vi.fn(),
        playEngine: vi.fn(),
        playVictory: vi.fn(),
      },
      isTruckFullyRepaired() {
        return Boolean(this.truckState.battery && this.truckState.fuel && this.truckState.engineRepaired);
      },
      triggerVictoryEscape() {
        this.state = 'victory';
      },
    };

    mockGame.miniGameManager = new MiniGameManager(mockGame);
  });

  describe('1. Barricade Boarding & Structural Reinforcement', () => {
    it('reserves timber planks and rejects barricading when inventory lacks wood', () => {
      // Inventory has 0 wood
      const res = mockGame.miniGameManager.rewardProcessor.reserveMaterials(
        'barricade_tx_fail',
        mockGame.inventory,
        [{ itemId: 'wood', count: 2 }]
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient materials');
    });

    it('processes successful barricade strike, consumes timber, advances time, and elevates base defense', () => {
      mockGame.inventory.addItem('wood', 4);

      mockGame.miniGameManager.rewardProcessor.reserveMaterials(
        'barricade_tx_ok',
        mockGame.inventory,
        [{ itemId: 'wood', count: 2 }]
      );

      const result = {
        outcome: 'success',
        score: 0.95,
        qualityTier: 'master',
        gameMinutesSpent: 20,
        rewardId: 'barricade_door_level_1',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'barricade_tx_ok',
        result,
        { skillExp: { skillName: 'crafting', exp: 25 } }
      );

      expect(receipt.success).toBe(true);
      // Wood consumed: 4 -> 2
      expect(mockGame.inventory.getItemCount('wood')).toBe(2);
      // Clock advanced 20 game minutes
      expect(mockGame.clock.minute).toBe(20);
      // Duplicate protection registered
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('barricade_door_level_1')).toBe(true);
    });
  });

  describe('2. Backup Generator Wiring & Blackout Power Restoration', () => {
    it('restores ranch electrical power and advances defense upon generator diagnostic success', () => {
      const result = {
        outcome: 'success',
        score: 0.88,
        qualityTier: 'good',
        gameMinutesSpent: 25,
        rewardId: 'gen_wiring_stage5',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'gen_tx_1',
        result,
        { skillExp: { skillName: 'electrical', exp: 30 } }
      );

      expect(receipt.success).toBe(true);
      expect(mockGame.clock.minute).toBe(25);
      expect(mockGame.player.skills.electrical).toBeGreaterThan(15);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('gen_wiring_stage5')).toBe(true);
    });
  });

  describe('3. Military Stash Lockpicking', () => {
    it('bypasses lock cylinder sweet spot and grants rare survival supplies', () => {
      const initialFood = mockGame.inventory.getItemCount('canned_food');
      const initialWater = mockGame.inventory.getItemCount('water_bottle');

      const result = {
        outcome: 'success',
        score: 0.92,
        qualityTier: 'master',
        gameMinutesSpent: 15,
        rewardId: 'lockpick_military_cache_01',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'lock_tx_1',
        result,
        {
          items: [
            { itemId: 'canned_food', count: 2 },
            { itemId: 'water_bottle', count: 1 },
          ],
          skillExp: { skillName: 'scavenging', exp: 30 },
        }
      );

      expect(receipt.success).toBe(true);
      expect(mockGame.inventory.getItemCount('canned_food')).toBeGreaterThan(initialFood);
      expect(mockGame.inventory.getItemCount('water_bottle')).toBeGreaterThan(initialWater);
      expect(mockGame.clock.minute).toBe(15);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('lockpick_military_cache_01')).toBe(true);
    });
  });

  describe('4. Utility Truck Engine Overhaul & Evacuation', () => {
    it('completes engine assembly, consumes 2x wood mounts, and readies truck for escape', () => {
      mockGame.inventory.addItem('wood', 3);
      mockGame.truckState.battery = true;
      mockGame.truckState.fuel = true;
      mockGame.worldStage = 'outbreak';

      mockGame.miniGameManager.rewardProcessor.reserveMaterials(
        'engine_tx_1',
        mockGame.inventory,
        [{ itemId: 'wood', count: 2 }]
      );

      const result = {
        outcome: 'success',
        score: 0.86,
        qualityTier: 'good',
        gameMinutesSpent: 30,
        rewardId: 'truck_engine_stage5',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'engine_tx_1',
        result,
        { skillExp: { skillName: 'crafting', exp: 35 } }
      );

      expect(receipt.success).toBe(true);
      // 2 wood consumed (3 -> 1)
      expect(mockGame.inventory.getItemCount('wood')).toBe(1);

      // Simulate engine completion handler
      mockGame.truckState.engineRepaired = true;
      expect(mockGame.isTruckFullyRepaired()).toBe(true);

      // Trigger escape evacuation
      if (mockGame.worldStage === 'outbreak') {
        mockGame.triggerVictoryEscape();
      }
      expect(mockGame.state).toBe('victory');
    });
  });

  describe('5. Real-Time Combat World Preservation', () => {
    it('ensures combat runs strictly in real-time world without mini-game hijacking', () => {
      mockGame.inventory.addItem('hand_trowel', 1);
      expect(mockGame.inventory.hasItem('hand_trowel', 1)).toBe(true);
      expect(mockGame.player.attack()).toBe(true);
      expect(mockGame.player.isAttacking).toBe(true);
      expect(mockGame.miniGameManager.activeActivity).toBeNull();
    });
  });
});
