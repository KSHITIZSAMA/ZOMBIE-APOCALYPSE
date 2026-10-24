/**
 * Before the Dead — Entry Point
 * Initialize and start the game.
 */

import { Game } from './core/Game.js';

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();

  // Expose for debugging in dev mode only
  if (import.meta.env.DEV) {
    window.__game = game;
  }
});
