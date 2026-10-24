import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundSystem } from '../src/audio/SoundSystem.js';

describe('SoundSystem — Procedural Web Audio', () => {
  let sound;
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
    sound = new SoundSystem();
  });

  it('initializes in unmuted state by default', () => {
    expect(sound.muted).toBe(false);
  });

  it('toggles mute state and saves preference to localStorage', () => {
    const isMuted = sound.toggleMute();
    expect(isMuted).toBe(true);
    expect(sound.muted).toBe(true);
    expect(localStorage.getItem('before_the_dead_muted')).toBe('true');

    const unmuted = sound.toggleMute();
    expect(unmuted).toBe(false);
    expect(sound.muted).toBe(false);
    expect(localStorage.getItem('before_the_dead_muted')).toBe('false');
  });

  it('restores mute preference from localStorage on instantiation', () => {
    localStorage.setItem('before_the_dead_muted', 'true');
    const restoredSound = new SoundSystem();
    expect(restoredSound.muted).toBe(true);
  });

  it('safely handles playback methods without crashing when muted or uninitialized', () => {
    sound.muted = true;
    expect(() => sound.playMeleeSwing()).not.toThrow();
    expect(() => sound.playHit()).not.toThrow();
    expect(() => sound.playZombieGroan(false)).not.toThrow();
    expect(() => sound.playZombieGroan(true)).not.toThrow();
    expect(() => sound.playSiren()).not.toThrow();
    expect(() => sound.playHammer()).not.toThrow();
    expect(() => sound.playCash()).not.toThrow();
    expect(() => sound.playWater()).not.toThrow();
    expect(() => sound.playClick()).not.toThrow();
    expect(() => sound.playEngine()).not.toThrow();
    expect(() => sound.playVictory()).not.toThrow();
    expect(() => sound.playGameOver()).not.toThrow();
  });
});
