/**
 * Tests for seeded RNG — Reproducibility, range, state save/restore.
 */

import { describe, it, expect } from 'vitest';
import { createRNG, generateSeed } from '../src/utils/rng.js';

describe('Seeded RNG', () => {
  describe('reproducibility', () => {
    it('produces the same sequence with the same seed', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(12345);

      const seq1 = Array.from({ length: 100 }, () => rng1.float());
      const seq2 = Array.from({ length: 100 }, () => rng2.float());

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences with different seeds', () => {
      const rng1 = createRNG(12345);
      const rng2 = createRNG(54321);

      const seq1 = Array.from({ length: 10 }, () => rng1.float());
      const seq2 = Array.from({ length: 10 }, () => rng2.float());

      // Extremely unlikely to be equal
      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('float()', () => {
    it('returns values in [0, 1)', () => {
      const rng = createRNG(42);
      for (let i = 0; i < 1000; i++) {
        const val = rng.float();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('produces varied output (not constant)', () => {
      const rng = createRNG(99);
      const values = new Set();
      for (let i = 0; i < 100; i++) {
        values.add(rng.float());
      }
      // Should have many unique values
      expect(values.size).toBeGreaterThan(90);
    });
  });

  describe('range()', () => {
    it('returns values within specified range inclusive', () => {
      const rng = createRNG(777);
      for (let i = 0; i < 1000; i++) {
        const val = rng.range(5, 15);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(15);
      }
    });

    it('returns exact value when min equals max', () => {
      const rng = createRNG(111);
      for (let i = 0; i < 10; i++) {
        expect(rng.range(7, 7)).toBe(7);
      }
    });

    it('covers the full range over many calls', () => {
      const rng = createRNG(222);
      const seen = new Set();
      for (let i = 0; i < 10000; i++) {
        seen.add(rng.range(1, 10));
      }
      // Should hit every value 1-10
      for (let v = 1; v <= 10; v++) {
        expect(seen.has(v)).toBe(true);
      }
    });
  });

  describe('state save and restore', () => {
    it('preserves the sequence after state restore', () => {
      const rng = createRNG(555);

      // Advance a few steps
      for (let i = 0; i < 50; i++) rng.float();

      // Save state
      const savedState = rng.getState();

      // Generate next values
      const futureValues = Array.from({ length: 20 }, () => rng.float());

      // Restore state
      rng.setState(savedState);

      // Same values should come out
      const restoredValues = Array.from({ length: 20 }, () => rng.float());

      expect(restoredValues).toEqual(futureValues);
    });

    it('getSeed returns the original seed', () => {
      const rng = createRNG(42);
      expect(rng.getSeed()).toBe(42);

      // Seed should not change after usage
      rng.float();
      rng.float();
      expect(rng.getSeed()).toBe(42);
    });
  });

  describe('generateSeed', () => {
    it('returns a 32-bit integer', () => {
      const seed = generateSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(2147483647);
    });
  });
});
