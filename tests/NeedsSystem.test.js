import { describe, it, expect } from 'vitest';
import { NeedsSystem } from '../src/core/NeedsSystem.js';
import { getItem } from '../src/data/items.js';

describe('NeedsSystem', () => {
  it('initializes with baseline non-starving stats', () => {
    const needs = new NeedsSystem();
    expect(needs.hunger).toBeLessThan(30);
    expect(needs.thirst).toBeLessThan(30);
    expect(needs.fatigue).toBeLessThan(30);
    expect(needs.health).toBe(100);
  });

  it('advances hunger, thirst, and fatigue over elapsed hours', () => {
    const needs = new NeedsSystem();
    const initialHunger = needs.hunger;
    const initialThirst = needs.thirst;
    const initialFatigue = needs.fatigue;

    needs.advanceHours(2);

    expect(needs.hunger).toBeGreaterThan(initialHunger);
    expect(needs.thirst).toBeGreaterThan(initialThirst);
    expect(needs.fatigue).toBeGreaterThan(initialFatigue);
  });

  it('applies trait modifiers (Hardy vs High Metabolism)', () => {
    const normal = new NeedsSystem();
    const hardy = new NeedsSystem();
    const highMeta = new NeedsSystem();

    normal.advanceHours(5, []);
    hardy.advanceHours(5, ['hardy']);
    highMeta.advanceHours(5, ['high_metabolism']);

    expect(hardy.hunger).toBeLessThan(normal.hunger);
    expect(highMeta.hunger).toBeGreaterThan(normal.hunger);
    expect(highMeta.thirst).toBeGreaterThan(normal.thirst);
  });

  it('restores hunger and thirst when consuming items', () => {
    const needs = new NeedsSystem();
    needs.hunger = 60;
    needs.thirst = 60;

    const cannedStew = getItem('canned_food');
    const water = getItem('water_bottle');

    needs.consume(cannedStew);
    expect(needs.hunger).toBeLessThan(60);

    needs.consume(water);
    expect(needs.thirst).toBeLessThan(60);
  });

  it('restores fatigue to 0 after sleep', () => {
    const needs = new NeedsSystem();
    needs.fatigue = 80;

    needs.sleep(8);

    expect(needs.fatigue).toBe(0);
  });

  it('deals health damage when extreme starvation or dehydration occurs', () => {
    const needs = new NeedsSystem();
    needs.hunger = 98;
    needs.thirst = 98;
    needs.health = 100;

    needs.advanceHours(3);

    expect(needs.health).toBeLessThan(100);
  });
});
