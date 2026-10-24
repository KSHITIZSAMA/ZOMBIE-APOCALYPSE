import { describe, it, expect, beforeEach } from 'vitest';
import { SaveSystem } from '../src/core/SaveSystem.js';
import { Player } from '../src/entities/Player.js';
import { Inventory } from '../src/core/Inventory.js';
import { NeedsSystem } from '../src/core/NeedsSystem.js';
import { FarmingSystem } from '../src/core/FarmingSystem.js';
import { EventManager } from '../src/core/EventManager.js';
import { ClockSystem } from '../src/core/ClockSystem.js';
import { createRNG } from '../src/utils/rng.js';

describe('SaveSystem', () => {
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

  function createTestGame() {
    const rng = createRNG('save_test_seed');
    const player = new Player();
    player.setConfiguration({
      name: 'Vance',
      occupation: 'farmer',
      traits: ['hardy', 'green_thumb'],
      skinColor: '#C9A378',
      hairStyle: 'short',
    });

    const clock = new ClockSystem();
    clock.day = 4;
    clock.hour = 14;

    const inventory = new Inventory(10);
    inventory.addItem('bread', 3);
    inventory.addItem('wood', 5);

    const needs = new NeedsSystem();
    needs.hunger = 40;
    needs.thirst = 35;
    needs.fatigue = 20;

    const farmingSystem = new FarmingSystem();
    const eventManager = new EventManager(rng);
    eventManager.completedEventIds.add('suspicious_broadcast');

    return {
      clock,
      player,
      inventory,
      needs,
      farmingSystem,
      eventManager,
      money: 720,
      worldStage: 'early_warning',
      baseDefenseLevel: 2,
      neighborReputation: 15,
      rng,
      sceneManager: { currentScene: 'exterior', getCurrentSceneConfig: () => ({ worldWidth: 3000, groundY: 500 }) },
      camera: { snapTo: () => {} },
      _updateHUD: () => {},
    };
  }

  it('saves and loads game state without data loss', () => {
    const originalGame = createTestGame();

    const saveResult = SaveSystem.save(originalGame);
    expect(saveResult.success).toBe(true);
    expect(SaveSystem.hasSave()).toBe(true);

    const summary = SaveSystem.getSaveSummary();
    expect(summary.playerName).toBe('Vance');
    expect(summary.day).toBe(4);
    expect(summary.money).toBe(720);

    // Create a new blank game and load into it
    const loadedGame = createTestGame();
    loadedGame.player.name = 'Temporary';
    loadedGame.money = 0;
    loadedGame.inventory.slots = [];

    const loadResult = SaveSystem.load(loadedGame);
    expect(loadResult.success).toBe(true);

    expect(loadedGame.player.name).toBe('Vance');
    expect(loadedGame.money).toBe(720);
    expect(loadedGame.clock.day).toBe(4);
    expect(loadedGame.clock.hour).toBe(14);
    expect(loadedGame.inventory.getItemCount('bread')).toBe(3);
    expect(loadedGame.inventory.getItemCount('wood')).toBe(5);
    expect(loadedGame.worldStage).toBe('early_warning');
    expect(loadedGame.baseDefenseLevel).toBe(2);
    expect(loadedGame.eventManager.completedEventIds.has('suspicious_broadcast')).toBe(true);
  });

  it('handles corrupt or empty save data gracefully', () => {
    mockStorage['before_the_dead_save_v1'] = 'corrupt_invalid_json{{';
    expect(SaveSystem.hasSave()).toBe(false);

    const game = createTestGame();
    const res = SaveSystem.load(game);
    expect(res.success).toBe(false);
  });
});
