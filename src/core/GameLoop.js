/**
 * GameLoop — Fixed timestep game loop with separate update and render.
 * Prevents simulation from depending on frame rate.
 * Caps catchup time to prevent spiral of death after tab inactivity.
 */

import { BALANCE } from '../data/balance.js';

export class GameLoop {
  /**
   * @param {function(number): void} updateFn - Called with dt in seconds for each simulation step.
   * @param {function(): void} renderFn - Called once per frame for rendering.
   */
  constructor(updateFn, renderFn) {
    this._update = updateFn;
    this._render = renderFn;

    this._running = false;
    this._rafId = null;
    this._lastTime = 0;
    this._accumulator = 0;

    this._timestepMs = BALANCE.SIMULATION_TIMESTEP_MS;
    this._timestepSec = this._timestepMs / 1000;
    this._maxFrameTimeMs = BALANCE.MAX_FRAME_TIME_MS;

    this._tick = this._tick.bind(this);
  }

  /**
   * Start the game loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    this._rafId = requestAnimationFrame(this._tick);
  }

  /**
   * Stop the game loop.
   */
  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Main tick — runs updates at fixed timestep, render at display rate.
   * @param {number} now - High-resolution timestamp.
   * @private
   */
  _tick(now) {
    if (!this._running) return;

    let frameTime = now - this._lastTime;
    this._lastTime = now;

    // Cap frame time to prevent spiral of death (e.g., after tab switch)
    if (frameTime > this._maxFrameTimeMs) {
      frameTime = this._maxFrameTimeMs;
    }

    this._accumulator += frameTime;

    // Run fixed-timestep simulation updates
    while (this._accumulator >= this._timestepMs) {
      this._update(this._timestepSec);
      this._accumulator -= this._timestepMs;
    }

    // Render once per frame
    this._render();

    this._rafId = requestAnimationFrame(this._tick);
  }
}
