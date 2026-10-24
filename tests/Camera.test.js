import { describe, it, expect } from 'vitest';
import { Camera } from '../src/core/Camera.js';
import { BALANCE } from '../src/data/balance.js';

describe('Camera', () => {
  it('initializes with correct viewport dimensions', () => {
    const cam = new Camera(800, 600);
    expect(cam.width).toBe(800);
    expect(cam.height).toBe(600);
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
  });

  it('snaps to target coordinate correctly centered', () => {
    const cam = new Camera(800, 600);
    cam.snapTo(1000);
    expect(cam.x).toBe(600); // 1000 - 800/2
  });

  it('clamps to world bounds on snap', () => {
    const cam = new Camera(800, 600);
    cam.snapTo(100);
    expect(cam.x).toBe(0);

    cam.snapTo(BALANCE.WORLD_WIDTH + 500);
    expect(cam.x).toBe(BALANCE.WORLD_WIDTH - 800);
  });

  it('respects dead zone and smooth following', () => {
    const cam = new Camera(800, 600);
    cam.snapTo(1000); // cam.x = 600, center is 1000
    const initialCamX = cam.x;

    // Inside dead zone (dead zone is 800 * 0.3 / 2 = 120px on either side)
    cam.update(1050, 0);
    expect(cam.x).toBe(initialCamX);

    // Outside dead zone (> 120px from center, e.g. 1200)
    cam.update(1200, 0);
    expect(cam.x).toBeGreaterThan(initialCamX);
  });

  it('converts world coordinates to screen coordinates', () => {
    const cam = new Camera(800, 600);
    cam.snapTo(1000); // cam.x = 600
    const screenPos = cam.worldToScreen(700, 100);
    expect(screenPos.x).toBe(100); // 700 - 600
    expect(screenPos.y).toBe(100);
  });

  it('provides continuous non-stuttering tracking during sustained movement', () => {
    const cam = new Camera(800, 600);
    cam.snapTo(1000); // cam.x = 600, screen center = 1000

    let playerX = 1150; // starts outside dead zone (800 * 0.18 / 2 = 72px)
    let lastCamX = cam.x;

    // Simulate 10 consecutive frames of player moving at 3px/frame
    for (let frame = 0; frame < 10; frame++) {
      playerX += 3;
      cam.update(playerX, 0);
      const camDelta = cam.x - lastCamX;
      // Camera must move forward on EVERY single frame without freezing (delta > 0)
      expect(camDelta).toBeGreaterThan(0);
      lastCamX = cam.x;
    }
  });
});
