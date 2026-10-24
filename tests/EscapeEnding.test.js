import { describe, it, expect, beforeEach } from 'vitest';
import { Inventory } from '../src/core/Inventory.js';
import { SaveSystem } from '../src/core/SaveSystem.js';

describe('Ending B — Escape Utility Truck & Evacuation', () => {
  let mockGame;
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
    mockGame = {
      worldStage: 'normal',
      state: 'playing',
      money: 450,
      neighborReputation: 10,
      inventory: new Inventory(12),
      clock: { day: 3, hour: 14, minute: 0, getTimeString: () => '14:00', pause: () => {} },
      player: { occupation: 'farmer', traits: [] },
      truckState: {
        battery: false,
        fuel: false,
        engineRepaired: false,
      },
      stats: {
        zombiesDefeated: 5,
        cropsHarvested: 8,
      },
      sound: {
        playHammer: () => {},
        playWater: () => {},
        playEngine: () => {},
        playVictory: () => {},
      },
      showNotification: (msg) => { mockGame.lastToast = msg; },
      isTruckFullyRepaired() {
        return Boolean(this.truckState.battery && this.truckState.fuel && this.truckState.engineRepaired);
      },
      interactWithTruck() {
        if (!this.truckState.battery) {
          if (this.inventory.hasItem('car_battery', 1)) {
            this.inventory.removeItem('car_battery', 1);
            this.truckState.battery = true;
            this.sound.playHammer();
            this.showNotification('Installed heavy 12V car battery into the utility truck.');
          } else {
            this.showNotification('Utility Truck: Missing a functioning Car Battery (buy from County Store).');
            return;
          }
        }

        if (!this.truckState.fuel) {
          if (this.inventory.hasItem('fuel_can', 1)) {
            this.inventory.removeItem('fuel_can', 1);
            this.truckState.fuel = true;
            this.sound.playWater();
            this.showNotification('Poured 5-gallon fuel canister into the truck tank.');
          } else {
            this.showNotification('Utility Truck: Fuel tank is dry. Requires a Fuel Canister (buy from County Store).');
            return;
          }
        }

        if (!this.truckState.engineRepaired) {
          if (this.player.occupation === 'mechanic') {
            this.truckState.engineRepaired = true;
            this.sound.playHammer();
            this.showNotification('Mechanic expertise: Tuned the carburetor and reconnected spark plugs.');
          } else if (this.inventory.hasItem('wood', 2)) {
            this.inventory.removeItem('wood', 2);
            this.truckState.engineRepaired = true;
            this.sound.playHammer();
            this.showNotification('Replaced damaged engine mounts and secured belts with 2x Timber Planks.');
          } else {
            this.showNotification('Utility Truck: Engine manifold damaged. Requires 2x Timber Planks to fix (or Mechanic skill).');
            return;
          }
        }

        if (this.isTruckFullyRepaired()) {
          if (this.worldStage === 'outbreak') {
            this.triggerVictoryEscape();
          } else {
            this.sound.playEngine();
            this.showNotification('Truck engine hums steadily! Ready for emergency evacuation if danger strikes.');
          }
        }
      },
      triggerVictoryEscape() {
        this.state = 'victory';
        this.calebEscaped = this.neighborReputation >= 15;
      },
    };
  });

  it('rejects repair when missing battery, fuel, or timber', () => {
    mockGame.interactWithTruck();
    expect(mockGame.truckState.battery).toBe(false);
    expect(mockGame.lastToast).toContain('Car Battery');
  });

  it('installs battery when player has car_battery', () => {
    mockGame.inventory.addItem('car_battery', 1);
    mockGame.interactWithTruck();
    expect(mockGame.truckState.battery).toBe(true);
    expect(mockGame.inventory.hasItem('car_battery', 1)).toBe(false);
  });

  it('adds fuel when player has fuel_can', () => {
    mockGame.truckState.battery = true;
    mockGame.inventory.addItem('fuel_can', 1);
    mockGame.interactWithTruck();
    expect(mockGame.truckState.fuel).toBe(true);
    expect(mockGame.inventory.hasItem('fuel_can', 1)).toBe(false);
  });

  it('mechanic repairs engine without consuming timber', () => {
    mockGame.truckState.battery = true;
    mockGame.truckState.fuel = true;
    mockGame.player.occupation = 'mechanic';

    mockGame.interactWithTruck();
    expect(mockGame.truckState.engineRepaired).toBe(true);
    expect(mockGame.isTruckFullyRepaired()).toBe(true);
  });

  it('non-mechanic repairs engine using 2 timber planks', () => {
    mockGame.truckState.battery = true;
    mockGame.truckState.fuel = true;
    mockGame.player.occupation = 'farmer';
    mockGame.inventory.addItem('wood', 2);

    mockGame.interactWithTruck();
    expect(mockGame.truckState.engineRepaired).toBe(true);
    expect(mockGame.inventory.hasItem('wood', 1)).toBe(false);
    expect(mockGame.isTruckFullyRepaired()).toBe(true);
  });

  it('triggers ready notification before outbreak starts', () => {
    mockGame.truckState = { battery: true, fuel: true, engineRepaired: true };
    mockGame.worldStage = 'normal';

    mockGame.interactWithTruck();
    expect(mockGame.state).toBe('playing');
    expect(mockGame.lastToast).toContain('Ready for emergency evacuation');
  });

  it('triggers Ending B victory escape during outbreak with Caleb when trust is high', () => {
    mockGame.truckState = { battery: true, fuel: true, engineRepaired: true };
    mockGame.worldStage = 'outbreak';
    mockGame.neighborReputation = 20; // Caleb trust >= 15

    mockGame.interactWithTruck();
    expect(mockGame.state).toBe('victory');
    expect(mockGame.calebEscaped).toBe(true);
  });

  it('triggers Ending B victory escape alone when Caleb trust is low', () => {
    mockGame.truckState = { battery: true, fuel: true, engineRepaired: true };
    mockGame.worldStage = 'outbreak';
    mockGame.neighborReputation = 5; // Caleb trust < 15

    mockGame.interactWithTruck();
    expect(mockGame.state).toBe('victory');
    expect(mockGame.calebEscaped).toBe(false);
  });

  it('persists and restores truckState via SaveSystem', () => {
    const fullMockGame = {
      worldStage: 'outbreak',
      baseDefenseLevel: 2,
      doorBarricadeLevel: 1,
      money: 400,
      neighborReputation: 12,
      truckState: { battery: true, fuel: true, engineRepaired: false },
      stats: { zombiesDefeated: 3, cropsHarvested: 5, damageDealt: 40, damageTaken: 10 },
      sceneManager: { currentScene: 'exterior', getCurrentSceneConfig: () => ({ worldWidth: 3000, groundY: 480 }) },
      clock: { day: 2, hour: 16, minute: 30, timeScale: 1 },
      player: { serialize: () => ({}), deserialize: () => {} },
      needs: { serialize: () => ({}), deserialize: () => {} },
      inventory: { serialize: () => ({}), deserialize: () => {} },
      farmingSystem: { serialize: () => ({}), deserialize: () => {} },
      eventManager: { serialize: () => ({}), deserialize: () => {} },
    };

    const saveRes = SaveSystem.save(fullMockGame);
    expect(saveRes.success).toBe(true);

    const loadTarget = {
      clock: {},
      player: { x: 500, y: 0, deserialize: () => {} },
      needs: { deserialize: () => {} },
      inventory: { deserialize: () => {} },
      farmingSystem: { deserialize: () => {} },
      eventManager: { deserialize: () => {} },
      sceneManager: { getCurrentSceneConfig: () => ({ worldWidth: 3000, groundY: 480 }) },
      _updateHUD: () => {},
    };

    const loadRes = SaveSystem.load(loadTarget);
    expect(loadRes.success).toBe(true);
    expect(loadTarget.truckState).toEqual({ battery: true, fuel: true, engineRepaired: false });
  });
});
