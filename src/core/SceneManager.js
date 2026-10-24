/**
 * SceneManager — Manages world scenes (Ranch Exterior vs Farmhouse Interior),
 * interactive objects, collision boundaries, and smooth screen fade transitions.
 */

import { BALANCE } from '../data/balance.js';

/** @enum {string} Scene identifiers */
export const SceneType = {
  EXTERIOR: 'exterior',
  INTERIOR: 'interior',
};

export class SceneManager {
  /**
   * @param {object} callbacks
   * @param {Function} callbacks.onNotification - (text) => void for atmospheric toasts
   */
  constructor({ onNotification = () => {} } = {}) {
    this.currentScene = SceneType.EXTERIOR;
    this.isTransitioning = false;
    this.onNotification = onNotification;

    /** @type {object|null} Currently highlighted interactive prompt */
    this.activePrompt = null;

    /** Notification toast element */
    this._toastTimer = null;

    // Define scenes
    this.scenes = {
      [SceneType.EXTERIOR]: {
        id: SceneType.EXTERIOR,
        name: 'Suncrest Ranch',
        worldWidth: BALANCE.WORLD_WIDTH,
        groundY: BALANCE.GROUND_Y,
        spawnX: 1420,
        interactiveObjects: [
          {
            id: 'house_door',
            x: 1418,
            width: 44,
            label: 'Enter Farmhouse',
            action: () => this.transitionTo(SceneType.INTERIOR, 120),
          },
          {
            id: 'well',
            x: 1705,
            width: 50,
            label: 'Inspect Water Well',
            action: () => this.onNotification('The stone well is full of clean, cold groundwater.'),
          },
          {
            id: 'garden',
            x: 1890,
            width: 130,
            label: 'Inspect Garden Soil',
            action: () => this.onNotification('Rich, dark soil prepared for planting crops.'),
          },
          {
            id: 'mailbox',
            x: 1180,
            width: 30,
            label: 'Check Mailbox',
            action: () => this.onNotification('Mailbox is empty. The local paper mentioned unusual illnesses in the next county.'),
          },
        ],
      },

      [SceneType.INTERIOR]: {
        id: SceneType.INTERIOR,
        name: 'Farmhouse Interior',
        worldWidth: 900,
        groundY: 480,
        spawnX: 120,
        interactiveObjects: [
          {
            id: 'exit_door',
            x: 120,
            width: 44,
            label: 'Exit to Ranch',
            action: () => this.transitionTo(SceneType.EXTERIOR, 1420),
          },
          {
            id: 'fireplace',
            x: 460,
            width: 80,
            label: 'Warm Fireplace',
            action: () => this.onNotification('The crackling fire casts a warm, comforting glow.'),
          },
          {
            id: 'bed',
            x: 775,
            width: 90,
            label: 'Rest on Bed',
            action: () => this.onNotification('A sturdy quilt bed. You can rest here when weary.'),
          },
          {
            id: 'table',
            x: 280,
            width: 70,
            label: 'Kitchen Table',
            action: () => this.onNotification('A wooden table with a solitary candle and supply notes.'),
          },
        ],
      },
    };
  }

  /**
   * Get configuration of active scene.
   * @returns {object}
   */
  getCurrentSceneConfig() {
    return this.scenes[this.currentScene];
  }

  /**
   * Check interactive objects near player and handle 'E' press.
   * @param {import('../entities/Player.js').Player} player
   * @param {import('../core/Input.js').Input} input
   */
  update(player, input) {
    if (this.isTransitioning) return;

    const scene = this.getCurrentSceneConfig();
    let closestObj = null;
    let closestDist = Infinity;

    for (const obj of scene.interactiveObjects) {
      const dist = Math.abs(player.x - obj.x);
      const interactRange = obj.width / 2 + 40;

      if (dist <= interactRange && dist < closestDist) {
        closestDist = dist;
        closestObj = obj;
      }
    }

    if (closestObj) {
      this.activePrompt = {
        id: closestObj.id,
        x: closestObj.x,
        y: scene.groundY,
        label: closestObj.label,
        action: closestObj.action,
      };

      if (input.isJustPressed('e')) {
        this.activePrompt.action();
      }
    } else {
      this.activePrompt = null;
    }
  }

  /**
   * Smooth fade-to-black scene transition.
   * @param {SceneType} targetSceneId
   * @param {number} targetSpawnX
   * @param {Function} [onSceneSwapped] - Callback invoked at peak black to reposition camera/player
   */
  transitionTo(targetSceneId, targetSpawnX, onSceneSwapped = null) {
    if (this.isTransitioning) return;
    if (!this.scenes[targetSceneId]) return;

    this.isTransitioning = true;
    this.activePrompt = null;

    const fadeEl = typeof document !== 'undefined' ? document.getElementById('screen-fade') : null;

    // 1. Fade to black
    if (fadeEl) {
      fadeEl.classList.add('active');
    }

    setTimeout(() => {
      // 2. At peak black: switch scene
      this.currentScene = targetSceneId;
      const scene = this.scenes[targetSceneId];

      if (onSceneSwapped) {
        onSceneSwapped(scene, targetSpawnX);
      }

      // 3. Fade back to transparent
      setTimeout(() => {
        if (fadeEl) {
          fadeEl.classList.remove('active');
        }
        this.isTransitioning = false;
      }, 300);
    }, 320);
  }
}
