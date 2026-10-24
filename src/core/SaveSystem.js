/**
 * SaveSystem — Versioned localStorage save and load system.
 * Persists complete world state, clock, player, inventory, needs, farming plots,
 * scheduled events, and narrative choices. Prevents duplicate rewards upon reload.
 */

const SAVE_KEY = 'before_the_dead_save_v1';
const CURRENT_VERSION = 1;

export class SaveSystem {
  /**
   * Check if a valid save game exists.
   * @returns {boolean}
   */
  static hasSave() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return data && data.version === CURRENT_VERSION && Boolean(data.player);
    } catch {
      return false;
    }
  }

  /**
   * Get metadata summary of saved run without full load.
   * @returns {object|null}
   */
  static getSaveSummary() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        playerName: data.player?.name || 'Survivor',
        day: data.clock?.day || 1,
        time: `${String(data.clock?.hour || 6).padStart(2, '0')}:${String(data.clock?.minute || 0).padStart(2, '0')}`,
        money: data.money || 0,
        savedAt: data.savedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Save complete game state.
   * @param {object} game
   * @returns {{ success: boolean, message: string }}
   */
  static save(game) {
    try {
      if (typeof localStorage === 'undefined') {
        return { success: false, message: 'Local storage unavailable in this environment.' };
      }

      const payload = {
        version: CURRENT_VERSION,
        savedAt: new Date().toISOString(),
        seed: game.rng ? game.rng.seed : null,
        worldStage: game.worldStage || 'normal',
        baseDefenseLevel: game.baseDefenseLevel || 0,
        doorBarricadeLevel: game.doorBarricadeLevel || 0,
        truckState: game.truckState ? { ...game.truckState } : { battery: false, fuel: false, engineRepaired: false },
        stats: game.stats ? { ...game.stats } : { zombiesDefeated: 0, cropsHarvested: 0, damageDealt: 0, damageTaken: 0 },
        neighborReputation: game.neighborReputation || 0,
        money: game.money,
        currentScene: game.sceneManager.currentScene,
        clock: {
          day: game.clock.day,
          hour: game.clock.hour,
          minute: game.clock.minute,
          timeScale: game.clock.timeScale,
        },
        player: game.player.serialize(),
        needs: game.needs.serialize(),
        inventory: game.inventory.serialize(),
        farming: game.farmingSystem.serialize(),
        events: game.eventManager.serialize(),
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return { success: true, message: 'Game saved successfully.' };
    } catch (err) {
      return { success: false, message: `Save failed: ${err.message}` };
    }
  }

  /**
   * Restore game state from save data.
   * @param {object} game
   * @returns {{ success: boolean, message: string }}
   */
  static load(game) {
    try {
      if (typeof localStorage === 'undefined') {
        return { success: false, message: 'Local storage unavailable.' };
      }

      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return { success: false, message: 'No save file found.' };
      }

      const data = JSON.parse(raw);
      if (data.version !== CURRENT_VERSION) {
        return { success: false, message: 'Incompatible save version.' };
      }

      // 1. Restore RNG & Seed
      if (data.seed !== null && data.seed !== undefined) {
        const { createRNG } = game;
        if (createRNG) game.rng = createRNG(data.seed);
      }

      // 2. Restore Clock
      if (data.clock) {
        game.clock.day = data.clock.day;
        game.clock.hour = data.clock.hour;
        game.clock.minute = data.clock.minute;
        game.clock.timeScale = data.clock.timeScale;
      }

      // 3. Restore Player & Money
      if (data.player) {
        game.player.deserialize(data.player);
      }
      game.money = data.money ?? 500;
      game.worldStage = data.worldStage || 'normal';
      game.baseDefenseLevel = data.baseDefenseLevel || 0;
      game.doorBarricadeLevel = data.doorBarricadeLevel || 0;
      game.truckState = data.truckState ? { ...data.truckState } : { battery: false, fuel: false, engineRepaired: false };
      game.stats = data.stats ? { ...data.stats } : { zombiesDefeated: 0, cropsHarvested: 0, damageDealt: 0, damageTaken: 0 };
      game.neighborReputation = data.neighborReputation || 0;

      // 4. Restore Needs & Inventory
      if (data.needs) game.needs.deserialize(data.needs);
      if (data.inventory) game.inventory.deserialize(data.inventory);
      if (data.farming) game.farmingSystem.deserialize(data.farming);

      // 5. Restore Event Manager (completed events, decisions, schedule)
      if (data.events && game.eventManager) {
        game.eventManager.deserialize(data.events);
      }

      // 6. Restore Scene
      if (data.currentScene && game.sceneManager) {
        game.sceneManager.currentScene = data.currentScene;
        const scene = game.sceneManager.getCurrentSceneConfig();
        game.player.y = scene.groundY;
      }

      // 7. Snap camera
      if (game.camera) {
        const scene = game.sceneManager.getCurrentSceneConfig();
        game.camera.snapTo(game.player.x, scene.worldWidth);
      }

      if (typeof game._updateHUD === 'function') {
        game._updateHUD();
      }

      return { success: true, message: 'Save loaded successfully.' };
    } catch (err) {
      return { success: false, message: `Load failed: ${err.message}` };
    }
  }

  /**
   * Delete saved run.
   */
  static clearSave() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SAVE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}
