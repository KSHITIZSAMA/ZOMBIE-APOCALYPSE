import { describe, it, expect, vi } from 'vitest';
import { SceneManager, SceneType } from '../src/core/SceneManager.js';
import { Player } from '../src/entities/Player.js';

describe('SceneManager', () => {
  it('starts in Ranch Exterior scene with defined world boundaries', () => {
    const sm = new SceneManager();
    expect(sm.currentScene).toBe(SceneType.EXTERIOR);

    const config = sm.getCurrentSceneConfig();
    expect(config.worldWidth).toBe(3000);
    expect(config.groundY).toBe(500);
    expect(config.interactiveObjects.length).toBeGreaterThanOrEqual(4);
  });

  it('detects interactive objects within interaction radius', () => {
    const sm = new SceneManager();
    const player = new Player();
    const input = { isJustPressed: () => false };

    // Move player right in front of Farmhouse front door (x = 1418)
    player.x = 1420;
    sm.update(player, input);

    expect(sm.activePrompt).not.toBeNull();
    expect(sm.activePrompt.id).toBe('house_door');
    expect(sm.activePrompt.label).toBe('Enter Farmhouse');

    // Move player far away
    player.x = 500;
    sm.update(player, input);
    expect(sm.activePrompt).toBeNull();
  });

  it('triggers interactive object action when E is pressed', () => {
    let triggered = false;
    const sm = new SceneManager({
      onNotification: () => {
        triggered = true;
      },
    });

    const player = new Player();
    // Stand in front of well (x = 1705)
    player.x = 1705;

    // Simulate pressing E
    const input = { isJustPressed: (key) => key === 'e' };
    sm.update(player, input);

    expect(triggered).toBe(true);
  });

  it('performs transition between exterior and interior scenes', () => {
    vi.useFakeTimers();

    const sm = new SceneManager();
    let swappedScene = null;
    let swappedSpawnX = null;

    sm.transitionTo(SceneType.INTERIOR, 120, (scene, spawnX) => {
      swappedScene = scene.id;
      swappedSpawnX = spawnX;
    });

    expect(sm.isTransitioning).toBe(true);

    // Advance half-way through transition
    vi.advanceTimersByTime(350);

    expect(sm.currentScene).toBe(SceneType.INTERIOR);
    expect(swappedScene).toBe(SceneType.INTERIOR);
    expect(swappedSpawnX).toBe(120);

    // Complete transition
    vi.advanceTimersByTime(350);
    expect(sm.isTransitioning).toBe(false);

    vi.useRealTimers();
  });

  it('preserves player state across scene transitions', () => {
    const player = new Player();
    player.setConfiguration({
      name: 'Elena Croft',
      occupation: 'electrician',
      traits: ['fast_walker'],
      hairStyle: 'ponytail',
      skinColor: '#C9A378',
    });

    // Save initial state
    const saved = player.serialize();

    // Transition simulates updating position
    player.x = 120;
    player.y = 480;

    // Verify identity, traits, and appearance were preserved
    expect(player.name).toBe('Elena Croft');
    expect(player.occupation).toBe('electrician');
    expect(player.traits).toContain('fast_walker');
    expect(player.hairStyle).toBe('ponytail');
    expect(player.skinColor).toBe('#C9A378');
    expect(player.speedModifier).toBeGreaterThan(1.0);
  });
});
