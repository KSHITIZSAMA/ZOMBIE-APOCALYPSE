/**
 * Camera — Side-scrolling camera that follows the player.
 * Uses smooth following with a dead zone in the center.
 * Supports configurable world bounds for scene transitions.
 */

import { BALANCE } from '../data/balance.js';

export class Camera {
  constructor(canvasWidth, canvasHeight) {
    /** @type {number} Camera position (left edge) in world coordinates */
    this.x = 0;
    /** @type {number} */
    this.y = 0;
    /** @type {number} */
    this.width = canvasWidth;
    /** @type {number} */
    this.height = canvasHeight;

    /** Dead zone: fraction of screen width where camera doesn't move */
    this.deadZone = 0.3;

    /** Smooth following factor (0 = no follow, 1 = snap) */
    this.smoothing = 0.08;
  }

  /**
   * Update camera to follow a target position.
   * @param {number} targetX - Target X in world coordinates (player center).
   * @param {number} targetY - Target Y in world coordinates.
   * @param {number} [customWorldWidth] - Current scene bounds width.
   */
  update(targetX, targetY, customWorldWidth = BALANCE.WORLD_WIDTH) {
    // If scene is narrower than viewport, center camera on scene
    if (this.width >= customWorldWidth) {
      this.x = (customWorldWidth - this.width) / 2;
      this.y = 0;
      return;
    }

    const screenCenterX = this.x + this.width / 2;
    const deadZonePixels = (this.width * this.deadZone) / 2;

    const dx = targetX - screenCenterX;

    // Only move if outside dead zone
    if (Math.abs(dx) > deadZonePixels) {
      const targetCamX = targetX - this.width / 2;
      this.x += (targetCamX - this.x) * this.smoothing;
    }

    // Clamp camera to world bounds
    const maxCamX = Math.max(0, customWorldWidth - this.width);
    this.x = Math.max(0, Math.min(this.x, maxCamX));
    this.y = 0;
  }

  /**
   * Convert world coordinates to screen coordinates.
   * @param {number} worldX
   * @param {number} worldY
   * @returns {{ x: number, y: number }}
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  /**
   * Resize the camera viewport.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  /**
   * Center camera immediately on a position.
   * @param {number} worldX
   * @param {number} [customWorldWidth]
   */
  snapTo(worldX, customWorldWidth = BALANCE.WORLD_WIDTH) {
    if (this.width >= customWorldWidth) {
      this.x = (customWorldWidth - this.width) / 2;
      return;
    }
    const maxCamX = Math.max(0, customWorldWidth - this.width);
    this.x = worldX - this.width / 2;
    this.x = Math.max(0, Math.min(this.x, maxCamX));
  }
}
