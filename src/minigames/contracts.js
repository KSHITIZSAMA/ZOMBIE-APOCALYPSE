/**
 * contracts.js — Result contracts, quality tiers, and validation for mini-games.
 * Enforces strict transactional outcomes and uniform return shapes across all activities.
 */

/**
 * @typedef {'success' | 'failure' | 'cancelled'} MiniGameOutcome
 */

/**
 * @typedef {'poor' | 'standard' | 'good' | 'master'} QualityTier
 */

/**
 * @typedef {object} MiniGameResult
 * @property {MiniGameOutcome} outcome - The result of the activity.
 * @property {number} score - Performance score clamped between 0.0 and 1.0.
 * @property {QualityTier} qualityTier - Outcome quality tier based on score.
 * @property {number} gameMinutesSpent - In-game minutes to advance upon completion.
 * @property {string} rewardId - Unique non-reusable transaction identifier.
 * @property {Record<string, any>} [metadata] - Optional contextual data.
 */

export const QualityThresholds = {
  MASTER: 0.90,
  GOOD: 0.70,
  STANDARD: 0.40,
  POOR: 0.0,
};

/**
 * Determine the quality tier from a normalized score (0.0 to 1.0).
 * @param {number} score
 * @returns {QualityTier}
 */
export function getQualityTier(score) {
  const s = Math.max(0, Math.min(1, Number(score) || 0));
  if (s >= QualityThresholds.MASTER) return 'master';
  if (s >= QualityThresholds.GOOD) return 'good';
  if (s >= QualityThresholds.STANDARD) return 'standard';
  return 'poor';
}

/**
 * Validate that a mini-game result object strictly satisfies the result contract.
 * @param {unknown} result
 * @returns {{ valid: boolean, error?: string, sanitized?: MiniGameResult }}
 */
export function validateMiniGameResult(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, error: 'Result must be a non-null object.' };
  }

  const { outcome, score, qualityTier, gameMinutesSpent, rewardId, metadata } = result;

  const validOutcomes = ['success', 'failure', 'cancelled'];
  if (!validOutcomes.includes(outcome)) {
    return { valid: false, error: `Invalid outcome "${outcome}". Must be one of: ${validOutcomes.join(', ')}.` };
  }

  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
    return { valid: false, error: 'Score must be a finite number between 0.0 and 1.0.' };
  }

  const validTiers = ['poor', 'standard', 'good', 'master'];
  if (!validTiers.includes(qualityTier)) {
    return { valid: false, error: `Invalid qualityTier "${qualityTier}". Must be one of: ${validTiers.join(', ')}.` };
  }

  if (typeof gameMinutesSpent !== 'number' || !Number.isFinite(gameMinutesSpent) || gameMinutesSpent < 0) {
    return { valid: false, error: 'gameMinutesSpent must be a non-negative finite number.' };
  }

  if (typeof rewardId !== 'string' || rewardId.trim().length === 0) {
    return { valid: false, error: 'rewardId must be a non-empty unique string.' };
  }

  return {
    valid: true,
    sanitized: {
      outcome,
      score: Math.max(0, Math.min(1, score)),
      qualityTier,
      gameMinutesSpent: Math.round(gameMinutesSpent),
      rewardId: rewardId.trim(),
      metadata: metadata && typeof metadata === 'object' ? { ...metadata } : {},
    },
  };
}

/**
 * Generate a unique, deterministic-friendly reward ID for an activity.
 * @param {string} activityType
 * @param {string|number} [disambiguator]
 * @returns {string}
 */
export function createRewardId(activityType, disambiguator = null) {
  const base = String(activityType || 'act').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const uid = disambiguator !== null && disambiguator !== undefined
    ? String(disambiguator)
    : `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  return `reward_${base}_${uid}`;
}
