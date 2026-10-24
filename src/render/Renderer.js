/**
 * Renderer — Main rendering coordinator.
 * Manages canvas, DPR scaling, scene dispatch (exterior vs interior), and interactive prompts.
 */

import { EnvironmentRenderer } from './EnvironmentRenderer.js';
import { RanchRenderer } from './RanchRenderer.js';
import { InteriorRenderer } from './InteriorRenderer.js';
import { CharacterRenderer } from './CharacterRenderer.js';
import { ZombieRenderer } from './ZombieRenderer.js';
import { PALETTE } from '../data/balance.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.envRenderer = new EnvironmentRenderer();
    this.ranchRenderer = new RanchRenderer();
    this.interiorRenderer = new InteriorRenderer();
    this.charRenderer = new CharacterRenderer();
    this.zombieRenderer = new ZombieRenderer();

    // High-DPI handling
    this._setupCanvas();
    window.addEventListener('resize', () => this._setupCanvas());
  }

  /**
   * Initialize procedural environment elements.
   * @param {import('../utils/rng.js').createRNG} rng
   */
  init(rng) {
    this.envRenderer.init(rng);
  }

  /**
   * Render a complete frame.
   * @param {import('../entities/Player.js').Player} player
   * @param {import('../core/Camera.js').Camera} camera
   * @param {import('../core/ClockSystem.js').ClockSystem} clock
   * @param {number} gameTime - Total elapsed game time in seconds.
   * @param {'exterior'|'interior'} sceneType - Current active scene.
   * @param {object|null} activePrompt - Currently highlighted interaction prompt.
   * @param {import('../core/FarmingSystem.js').FarmingSystem} [farmingSystem]
   * @param {string} [worldStage] - World danger stage
   * @param {Array<import('../entities/Zombie.js').Zombie>} [zombies]
   * @param {number} [doorBarricadeLevel]
   * @param {number} [damageFlashAlpha]
   */
  renderFrame(
    player,
    camera,
    clock,
    gameTime,
    sceneType = 'exterior',
    activePrompt = null,
    farmingSystem = null,
    worldStage = 'normal',
    zombies = [],
    doorBarricadeLevel = 0,
    damageFlashAlpha = 0,
    truckRepaired = false
  ) {
    const ctx = this.ctx;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const logW = this._logicalWidth || 1280;
    const logH = this._logicalHeight || 720;

    ctx.save();
    if (typeof ctx.setTransform === 'function') {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, logW, logH);

    if (sceneType === 'exterior') {
      // 1. Natural environment backdrop & ground
      this.envRenderer.render(ctx, camera, clock, gameTime, worldStage);
      // 2. Ranch exterior structures
      this.ranchRenderer.render(ctx, camera, clock.getDaylightFactor(), gameTime, farmingSystem, worldStage, doorBarricadeLevel, truckRepaired);

      // 3. Render active exterior Zombies
      for (const zombie of zombies) {
        const zPos = camera.worldToScreen(zombie.x, zombie.y);
        this.zombieRenderer.draw(ctx, zPos.x, zPos.y, zombie, gameTime);
      }
    } else {
      // Farmhouse interior scene
      this.interiorRenderer.render(ctx, camera, clock, gameTime);
    }

    // 4. Player Stickman
    const screenPos = camera.worldToScreen(player.x, player.y);
    this.charRenderer.draw(
      ctx,
      screenPos.x,
      screenPos.y,
      player.getAppearance(),
      player.facing,
      player.getWalkPhase(),
      player.isWalking,
      player.isAttacking,
      player.getAttackProgress()
    );

    // 5. In-world interaction prompt badge
    if (activePrompt) {
      this._drawInteractionPrompt(ctx, camera, activePrompt, player);
    }

    // 6. Red damage vignette flash
    if (damageFlashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(180, 25, 25, ${Math.min(0.65, damageFlashAlpha)})`;
      ctx.fillRect(0, 0, logW, logH);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draw an atmospheric hand-drawn interaction prompt over the target.
   * @private
   */
  _drawInteractionPrompt(ctx, camera, prompt, player) {
    const screenX = prompt.x - camera.x;
    const screenY = prompt.y - 70;

    ctx.save();
    ctx.font = '600 13px Inter, sans-serif';
    const text = prompt.label;
    const textWidth = ctx.measureText(text).width;
    const padX = 12;
    const boxW = textWidth + padX * 2 + 24;
    const boxH = 26;
    const boxX = screenX - boxW / 2;
    const boxY = screenY - boxH / 2;

    // Badge shadow & background
    ctx.fillStyle = 'rgba(26, 26, 24, 0.88)';
    ctx.strokeStyle = PALETTE.INTERIOR_LIGHT;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Key icon badge [E]
    ctx.fillStyle = PALETTE.INTERIOR_LIGHT;
    ctx.beginPath();
    ctx.roundRect(boxX + 5, boxY + 4, 18, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#1c1c1a';
    ctx.font = '700 11px Inter, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', boxX + 14, boxY + 13);

    // Prompt action text
    ctx.fillStyle = PALETTE.PAPER;
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, boxX + 28, boxY + 14);

    ctx.restore();
  }

  /**
   * Setup canvas for proper rendering on high-DPI screens.
   * @private
   */
  _setupCanvas() {
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const rect = typeof this.canvas.getBoundingClientRect === 'function'
      ? this.canvas.getBoundingClientRect()
      : { width: 1280, height: 720 };

    if (rect.width > 0 && rect.height > 0) {
      this._logicalWidth = rect.width;
      this._logicalHeight = rect.height;
    } else {
      this._logicalWidth = 1280;
      this._logicalHeight = 720;
    }

    this.canvas.width = this._logicalWidth * dpr;
    this.canvas.height = this._logicalHeight * dpr;

    if (this.ctx && typeof this.ctx.scale === 'function') {
      this.ctx.scale(dpr, dpr);
    }

    this.canvas.logicalWidth = this._logicalWidth;
    this.canvas.logicalHeight = this._logicalHeight;
  }

  /**
   * Get cached logical canvas dimensions (CSS pixels) without triggering reflows.
   * @returns {{ width: number, height: number }}
   */
  getLogicalSize() {
    return {
      width: this._logicalWidth || this.canvas.logicalWidth || 1280,
      height: this._logicalHeight || this.canvas.logicalHeight || 720,
    };
  }
}
