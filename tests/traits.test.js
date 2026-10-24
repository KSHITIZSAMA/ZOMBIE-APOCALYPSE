import { describe, it, expect } from 'vitest';
import { getTrait, getAllTraits, validateTraits } from '../src/data/traits.js';

describe('Traits & Balancing System', () => {
  it('retrieves traits and categorizes into positive and negative', () => {
    const { positive, negative } = getAllTraits();
    expect(positive.length).toBeGreaterThan(0);
    expect(negative.length).toBeGreaterThan(0);

    for (const t of positive) {
      expect(t.type).toBe('positive');
      expect(t.cost).toBeGreaterThan(0);
    }
    for (const t of negative) {
      expect(t.type).toBe('negative');
      expect(t.cost).toBeLessThan(0);
    }
  });

  it('validates a balanced selection of traits', () => {
    // 1 negative (+2 pts) and 1 positive (-2 pts) = 0 net points
    const res = validateTraits(['slow_walker', 'keen_eyes'], 0);
    expect(res.valid).toBe(true);
    expect(res.remainingPoints).toBe(0);
    expect(res.errors.length).toBe(0);
  });

  it('rejects selection when point cost exceeds available points', () => {
    // Cost: Hardy (3) = needs 3 points, base = 0
    const res = validateTraits(['hardy'], 0);
    expect(res.valid).toBe(false);
    expect(res.remainingPoints).toBe(-3);
    expect(res.errors.some((e) => e.includes('Insufficient trait points'))).toBe(true);
  });

  it('enforces maximum 3 negative traits', () => {
    const res = validateTraits(['frail', 'slow_walker', 'heavy_sleeper', 'poor_vision'], 10);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Maximum of 3 negative traits'))).toBe(true);
  });

  it('enforces negative traits point grant cap of +6', () => {
    // frail (-3), heavy_sleeper (-2), high_metabolism (-2) = +7 points > +6 cap
    const res = validateTraits(['frail', 'heavy_sleeper', 'high_metabolism'], 10);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('can grant at most +6'))).toBe(true);
  });

  it('rejects conflicting incompatible traits', () => {
    const res = validateTraits(['hardy', 'frail'], 10);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('conflicts with incompatible trait'))).toBe(true);
  });

  it('rejects duplicate traits', () => {
    const res = validateTraits(['hardy', 'hardy'], 10);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Duplicate trait'))).toBe(true);
  });

  it('applies speed multiplier to Player based on traits', () => {
    const traitFast = getTrait('fast_walker');
    const traitSlow = getTrait('slow_walker');
    expect(traitFast.speedMultiplier).toBeGreaterThan(1.0);
    expect(traitSlow.speedMultiplier).toBeLessThan(1.0);
  });
});
