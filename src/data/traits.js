/**
 * Character Traits definition and balancing system.
 * Positive traits consume points.
 * Negative traits grant points (up to +6 max, max 3 negative traits).
 * Mutual exclusions are strictly validated.
 */

import { BALANCE } from './balance.js';

export const TRAITS = {
  // --- Positive Traits ---
  HARDY: {
    id: 'hardy',
    name: 'Hardy',
    type: 'positive',
    cost: 3,
    description: 'Resilient constitution. Decreases hunger rate by 15% and increases maximum stamina.',
    incompatibleWith: ['frail'],
  },
  FAST_WALKER: {
    id: 'fast_walker',
    name: 'Swift Stride',
    type: 'positive',
    cost: 2,
    description: 'Brisk walking pace (+15% movement speed).',
    incompatibleWith: ['slow_walker'],
    speedMultiplier: 1.15,
  },
  GREEN_THUMB: {
    id: 'green_thumb',
    name: 'Green Thumb',
    type: 'positive',
    cost: 3,
    description: 'Natural instinct for flora. Boosts crop yield and resilience.',
    incompatibleWith: [],
  },
  KEEN_EYES: {
    id: 'keen_eyes',
    name: 'Keen Eyes',
    type: 'positive',
    cost: 2,
    description: 'Sharp vision that reveals hidden scavenging spots and early environmental anomalies.',
    incompatibleWith: ['poor_vision'],
  },
  HANDYMAN: {
    id: 'handyman',
    name: 'Handyman',
    type: 'positive',
    cost: 2,
    description: 'Aptitude with basic tools. Reduces tool degradation and repair costs.',
    incompatibleWith: [],
  },

  // --- Negative Traits ---
  FRAIL: {
    id: 'frail',
    name: 'Frail',
    type: 'negative',
    cost: -3, // Grants 3 points
    description: 'Susceptible to illness, exhaustion, and physical strain. Increases fatigue rate.',
    incompatibleWith: ['hardy'],
  },
  SLOW_WALKER: {
    id: 'slow_walker',
    name: 'Sluggish Stride',
    type: 'negative',
    cost: -2, // Grants 2 points
    description: 'Plodding, measured movement (-15% movement speed).',
    incompatibleWith: ['fast_walker'],
    speedMultiplier: 0.85,
  },
  HEAVY_SLEEPER: {
    id: 'heavy_sleeper',
    name: 'Heavy Sleeper',
    type: 'negative',
    cost: -2, // Grants 2 points
    description: 'Takes longer to wake up and requires more continuous sleep to feel refreshed.',
    incompatibleWith: [],
  },
  HIGH_METABOLISM: {
    id: 'high_metabolism',
    name: 'High Metabolism',
    type: 'negative',
    cost: -2, // Grants 2 points
    description: 'Consumes food and water significantly faster (+20% hunger & thirst drain).',
    incompatibleWith: [],
  },
  POOR_VISION: {
    id: 'poor_vision',
    name: 'Poor Vision',
    type: 'negative',
    cost: -2, // Grants 2 points
    description: 'Impaired long-range sight. Slower to detect distant objects in fog.',
    incompatibleWith: ['keen_eyes'],
  },
};

/**
 * Get trait object by id.
 * @param {string} id
 * @returns {object|null}
 */
export function getTrait(id) {
  return TRAITS[id.toUpperCase()] || null;
}

/**
 * Get all available traits grouped by type.
 * @returns {{ positive: object[], negative: object[] }}
 */
export function getAllTraits() {
  const all = Object.values(TRAITS);
  return {
    positive: all.filter((t) => t.type === 'positive'),
    negative: all.filter((t) => t.type === 'negative'),
  };
}

/**
 * Validate a set of selected trait IDs.
 * Rules:
 * - Duplicate traits prohibited
 * - Incompatible pairs prohibited
 * - Max 3 negative traits
 * - Max +6 points gained from negative traits
 * - Final net points cannot be negative (cost cannot exceed available points)
 *
 * @param {string[]} traitIds - List of trait IDs.
 * @param {number} basePoints - Starting point pool (default 0).
 * @returns {{ valid: boolean, errors: string[], remainingPoints: number, negativePointsGained: number, negativeCount: number }}
 */
export function validateTraits(traitIds, basePoints = 0) {
  const errors = [];
  const seen = new Set();
  let costTotal = 0;
  let negativePointsGained = 0;
  let negativeCount = 0;

  for (const id of traitIds) {
    const trait = getTrait(id);
    if (!trait) {
      errors.push(`Unknown trait ID: "${id}"`);
      continue;
    }

    // Duplicate check
    if (seen.has(trait.id)) {
      errors.push(`Duplicate trait selected: "${trait.name}"`);
      continue;
    }
    seen.add(trait.id);

    // Negative counts and point caps
    if (trait.type === 'negative') {
      negativeCount += 1;
      const pointsGranted = Math.abs(trait.cost);
      negativePointsGained += pointsGranted;
    }

    costTotal += trait.cost;
  }

  // Check negative trait count
  if (negativeCount > BALANCE.MAX_NEGATIVE_TRAITS) {
    errors.push(`Maximum of ${BALANCE.MAX_NEGATIVE_TRAITS} negative traits allowed (selected ${negativeCount})`);
  }

  // Check negative trait points cap
  if (negativePointsGained > BALANCE.MAX_NEGATIVE_TRAIT_POINTS) {
    errors.push(`Negative traits can grant at most +${BALANCE.MAX_NEGATIVE_TRAIT_POINTS} total points (current: +${negativePointsGained})`);
  }

  // Check incompatibility
  for (const id of traitIds) {
    const trait = getTrait(id);
    if (!trait) continue;
    for (const incomp of trait.incompatibleWith) {
      if (seen.has(incomp)) {
        const other = getTrait(incomp);
        errors.push(`"${trait.name}" conflicts with incompatible trait "${other?.name || incomp}"`);
      }
    }
  }

  // Point budget check
  const remainingPoints = basePoints - costTotal;
  if (remainingPoints < 0) {
    errors.push(`Insufficient trait points: you need ${Math.abs(remainingPoints)} more point(s)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    remainingPoints,
    negativePointsGained,
    negativeCount,
  };
}
