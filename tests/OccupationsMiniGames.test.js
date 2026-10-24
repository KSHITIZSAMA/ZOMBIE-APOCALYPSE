import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllJobs, getJob } from '../src/data/jobs.js';
import { MiniGameManager } from '../src/minigames/MiniGameManager.js';
import { Inventory } from '../src/core/Inventory.js';
import { ClockSystem } from '../src/core/ClockSystem.js';
import { NeedsSystem } from '../src/core/NeedsSystem.js';
import { FarmingSystem } from '../src/core/FarmingSystem.js';
import { Player } from '../src/entities/Player.js';
import { validateMiniGameResult } from '../src/minigames/contracts.js';

describe('Stage 4 — Occupations & Economy Mini-Games', () => {
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

    const inventory = new Inventory(10);
    const clock = new ClockSystem();
    const needs = new NeedsSystem();
    const farmingSystem = new FarmingSystem();
    const player = new Player();
    player.setConfiguration({
      name: 'Vance',
      occupation: 'farmer',
      traits: ['green_thumb'],
    });
    player.skills = { farming: 10, crafting: 10, electrical: 0, scavenging: 10 };

    mockGame = {
      inventory,
      clock,
      needs,
      farmingSystem,
      player,
      money: 100,
      stats: { cropsHarvested: 0 },
      _updateHUD: vi.fn(),
      showNotification: vi.fn(),
      sound: {
        playCash: vi.fn(),
        playClick: vi.fn(),
      },
    };

    mockGame.miniGameManager = new MiniGameManager(mockGame);
  });

  describe('1. Occupation & Contract Definitions', () => {
    it('defines 7 distinct employment contracts with assigned mini-game mechanics', () => {
      const jobs = getAllJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(7);

      const mechanics = jobs.map((j) => j.mechanic);
      expect(mechanics).toContain('timing_bar');
      expect(mechanics).toContain('connect_match');
      expect(mechanics).toContain('ordered_sequence');
      expect(mechanics).toContain('grid_selection');
      expect(mechanics).toContain('pack_fit');
    });

    it('validates specialized occupation access and bonuses', () => {
      const farmJob = getJob('farm_hand');
      const elecJob = getJob('electrical_repair');
      const writerJob = getJob('freelance_article');
      const carpJob = getJob('carpentry_contract');

      expect(farmJob.mechanic).toBe('timing_bar');
      expect(elecJob.mechanic).toBe('connect_match');
      expect(writerJob.mechanic).toBe('ordered_sequence');
      expect(carpJob.mechanic).toBe('timing_bar');

      // Farmer perk gives +15 on farm_hand
      expect(farmJob.getReward(mockGame.player)).toBe(75);

      // Electrician requirement check
      expect(elecJob.requiredOccupation).toBe('electrician');
    });
  });

  describe('2. Contract Mini-Game Execution & Reward Processing', () => {
    it('executes Timber Cutting contract via Timing Bar and grants wages with quality bonus', () => {
      const carpJob = getJob('carpentry_contract');
      const initialMoney = mockGame.money;
      const initialHour = mockGame.clock.hour;

      const result = {
        outcome: 'success',
        score: 0.94,
        qualityTier: 'master',
        gameMinutesSpent: carpJob.durationHours * 60,
        rewardId: 'job_carpentry_01',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'txn_carp_1',
        result,
        {
          money: carpJob.getReward(mockGame.player),
          skillExp: { skillName: carpJob.skill, exp: 25 },
        }
      );

      expect(receipt.success).toBe(true);
      expect(receipt.qualityTier).toBe('master');
      // Master tier multiplies monetary reward by 1.30 (95 * 1.30 = 124)
      expect(mockGame.money).toBe(initialMoney + 124);
      expect(mockGame.clock.hour).toBe(initialHour + carpJob.durationHours);
      expect(mockGame.player.skills.crafting).toBeGreaterThan(0);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('job_carpentry_01')).toBe(true);
    });

    it('executes Investigative News Column via Ordered Sequence and rewards writer', () => {
      const writerJob = getJob('freelance_article');
      const initialMoney = mockGame.money;

      const result = {
        outcome: 'success',
        score: 0.85,
        qualityTier: 'good',
        gameMinutesSpent: writerJob.durationHours * 60,
        rewardId: 'job_writer_01',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'txn_writer_1',
        result,
        {
          money: writerJob.getReward(),
          skillExp: { skillName: writerJob.skill, exp: 25 },
        }
      );

      expect(receipt.success).toBe(true);
      // Good tier multiplies monetary reward by 1.10 (85 * 1.10 = 94)
      expect(mockGame.money).toBe(initialMoney + 94);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('job_writer_01')).toBe(true);
    });

    it('executes Scavenger Salvage via Grid Selection and rewards salvage find', () => {
      const scavJob = getJob('scavenger_haul');
      const initialMoney = mockGame.money;

      const result = {
        outcome: 'success',
        score: 0.78,
        qualityTier: 'good',
        gameMinutesSpent: scavJob.durationHours * 60,
        rewardId: 'job_scav_01',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'txn_scav_1',
        result,
        {
          money: scavJob.getReward(mockGame.player),
          skillExp: { skillName: scavJob.skill, exp: 25 },
        }
      );

      expect(receipt.success).toBe(true);
      expect(mockGame.money).toBeGreaterThan(initialMoney);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('job_scav_01')).toBe(true);
    });

    it('executes Courier Cargo Stacking via Pack & Fit and rewards logistics efficiency', () => {
      const courierJob = getJob('courier_cargo');
      const initialMoney = mockGame.money;

      const result = {
        outcome: 'success',
        score: 0.82,
        qualityTier: 'good',
        gameMinutesSpent: courierJob.durationHours * 60,
        rewardId: 'job_courier_01',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'txn_courier_1',
        result,
        {
          money: courierJob.getReward(),
          skillExp: { skillName: courierJob.skill, exp: 25 },
        }
      );

      expect(receipt.success).toBe(true);
      expect(mockGame.money).toBeGreaterThan(initialMoney);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('job_courier_01')).toBe(true);
    });
  });

  describe('3. Mastery Quick-Work Integration for Occupations', () => {
    it('enables Quick Work when player has skill >= 30 and executes instantly', () => {
      mockGame.player.skills.farming = 35;
      const farmJob = getJob('farm_hand');

      // Quick work is available for skilled agriculturalist
      expect(mockGame.miniGameManager.isQuickWorkAvailable(farmJob.id, mockGame.player.skills.farming)).toBe(true);

      const initialMoney = mockGame.money;
      const initialHour = mockGame.clock.hour;

      const quickReceipt = mockGame.miniGameManager.executeQuickWork({
        type: farmJob.id,
        gameMinutesSpent: farmJob.durationHours * 60,
        requiredMaterials: [],
        rewardDefinition: {
          money: farmJob.getReward(mockGame.player),
          skillExp: { skillName: 'farming', exp: 20 },
        },
      });

      expect(quickReceipt.success).toBe(true);
      expect(quickReceipt.qualityTier).toBe('good');
      // Money granted with standard 1.1x good multiplier (75 * 1.1 = 83)
      expect(mockGame.money).toBe(initialMoney + 83);
      // Clock advanced 4 hours
      expect(mockGame.clock.hour).toBe(initialHour + farmJob.durationHours);
      // Mastery counter increments
      expect(mockGame.miniGameManager.getMasteryCount(farmJob.id)).toBe(1);
    });

    it('tracks mastery count over repeated shift completions to unlock future quick work', () => {
      const job = getJob('scavenger_haul');
      // Low skill initially (0)
      expect(mockGame.miniGameManager.isQuickWorkAvailable(job.id, 0)).toBe(false);

      // Simulate player manually mastering the job 3 times
      mockGame.miniGameManager.activityMastery.set(job.id, 3);

      // Even with 0 skill, high activity mastery permits Quick Work!
      expect(mockGame.miniGameManager.isQuickWorkAvailable(job.id, 0)).toBe(true);
    });
  });
});
