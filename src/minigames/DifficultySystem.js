/**
 * DifficultySystem.js — Centralized difficulty and parameter derivation for mini-games.
 * Implements the formula:
 * effectiveDifficulty = baseDifficulty - skillBonus - toolBonus + fatiguePenalty + traitPenalty
 * Clamped strictly to configured limits and supports Assisted Mode.
 */

export const DIFFICULTY_LIMITS = {
  MIN: 0.10,
  MAX: 0.85, // Negative traits must NEVER make activities impossible
};

export class DifficultySystem {
  /**
   * Calculate effective difficulty from player state, skills, tools, and traits.
   * @param {object} options
   * @param {number} [options.baseDifficulty=0.5] - Base activity difficulty (0.1 - 0.9).
   * @param {number} [options.skillLevel=0] - Relevant player skill (0 - 100).
   * @param {number} [options.toolBonus=0] - Tool quality deduction (e.g. 0.05 - 0.15).
   * @param {number} [options.fatigue=0] - Player fatigue percentage (0 - 100).
   * @param {Array<string>} [options.traits=[]] - Player trait IDs.
   * @param {boolean} [options.assistedMode=false] - Whether accessibility assisted mode is on.
   * @returns {{
   *   effectiveDifficulty: number,
   *   breakdown: {
   *     baseDifficulty: number,
   *     skillBonus: number,
   *     toolBonus: number,
   *     fatiguePenalty: number,
   *     traitPenalty: number,
   *     assistedReduction: number
   *   }
   * }}
   */
  static calculateDifficulty({
    baseDifficulty = 0.5,
    skillLevel = 0,
    toolBonus = 0,
    fatigue = 0,
    traits = [],
    assistedMode = false,
  } = {}) {
    const base = Math.max(0.1, Math.min(0.9, Number(baseDifficulty) || 0.5));

    // Skill bonus: Up to -0.30 at 100 skill level
    const clampedSkill = Math.max(0, Math.min(100, Number(skillLevel) || 0));
    const skillBonus = (clampedSkill / 100) * 0.30;

    // Tool bonus: Clamped up to -0.20
    const toolB = Math.max(0, Math.min(0.20, Number(toolBonus) || 0));

    // Fatigue penalty: High fatigue (>50%) adds up to +0.20 penalty
    const clampedFatigue = Math.max(0, Math.min(100, Number(fatigue) || 0));
    let fatiguePenalty = 0;
    if (clampedFatigue > 50) {
      fatiguePenalty = ((clampedFatigue - 50) / 50) * 0.20;
    }

    // Trait modifiers
    let traitPenalty = 0;
    const traitList = Array.isArray(traits) ? traits : [];

    if (traitList.includes('hardy')) {
      // Hardy trait halves fatigue penalty
      fatiguePenalty *= 0.5;
    }
    if (traitList.includes('green_thumb')) {
      // Green thumb reduces agricultural difficulty
      traitPenalty -= 0.08;
    }
    if (traitList.includes('resourceful')) {
      traitPenalty -= 0.05;
    }
    if (traitList.includes('paranoid')) {
      // Slight tension penalty
      traitPenalty += 0.05;
    }
    if (traitList.includes('frail')) {
      traitPenalty += 0.08;
    }

    // Assisted mode grants a substantial flat reduction
    const assistedReduction = assistedMode ? 0.25 : 0;

    // Formula execution
    const rawDifficulty = base - skillBonus - toolB + fatiguePenalty + traitPenalty - assistedReduction;

    // Enforce configured clamp bounds
    const effectiveDifficulty = Math.max(
      DIFFICULTY_LIMITS.MIN,
      Math.min(DIFFICULTY_LIMITS.MAX, Number(rawDifficulty.toFixed(3)))
    );

    return {
      effectiveDifficulty,
      breakdown: {
        baseDifficulty: base,
        skillBonus: Number(skillBonus.toFixed(3)),
        toolBonus: toolB,
        fatiguePenalty: Number(fatiguePenalty.toFixed(3)),
        traitPenalty: Number(traitPenalty.toFixed(3)),
        assistedReduction,
      },
    };
  }

  /**
   * Derive mechanics parameters based on effective difficulty.
   * @param {'timing_bar'|'ordered_sequence'|'grid_selection'|'connect_match'|'pack_fit'} mechanicType
   * @param {number} effectiveDifficulty - Normalized difficulty (0.10 to 0.85).
   * @returns {Record<string, any>} Derived parameters
   */
  static deriveParameters(mechanicType, effectiveDifficulty) {
    const diff = Math.max(DIFFICULTY_LIMITS.MIN, Math.min(DIFFICULTY_LIMITS.MAX, effectiveDifficulty));

    switch (mechanicType) {
      case 'timing_bar': {
        // Target zone width shrinks with difficulty (e.g. 42% at min diff, down to 14% at max diff)
        const targetZoneWidth = Math.round(42 - diff * 32); // 42% -> ~14%
        // Indicator speed increases with difficulty (e.g. 180 px/s to 460 px/s)
        const indicatorSpeed = Math.round(180 + diff * 320);
        // Attempts allowed (3 at low difficulty, 2 at medium/high, 1 at extreme)
        const attempts = diff > 0.75 ? 1 : diff > 0.45 ? 2 : 3;

        return {
          targetZoneWidth,
          indicatorSpeed,
          attempts,
        };
      }

      case 'ordered_sequence': {
        // Sequence steps (3 steps at easy, up to 6 at hardest)
        const stepCount = Math.min(7, Math.max(3, Math.round(3 + diff * 4)));
        // Allowed mistakes before failing
        const allowedMistakes = diff > 0.65 ? 1 : 2;

        return {
          stepCount,
          allowedMistakes,
        };
      }

      case 'grid_selection': {
        // Grid size: 3x3 at low difficulty, 4x4 at medium, up to 5x5 at high
        const gridSize = diff > 0.60 ? 5 : diff > 0.35 ? 4 : 3;
        const targetCount = Math.round(2 + diff * 4);
        const allowedMistakes = diff > 0.70 ? 1 : 2;

        return {
          gridSize,
          targetCount,
          allowedMistakes,
        };
      }

      case 'connect_match': {
        // Connections count: 3 to 6 lines/pairs
        const pairCount = Math.min(6, Math.max(3, Math.round(3 + diff * 3.5)));
        const allowedMistakes = diff > 0.65 ? 1 : 2;

        return {
          pairCount,
          allowedMistakes,
        };
      }

      case 'pack_fit': {
        // Container capacity & item count
        const containerCapacity = Math.round(8 + diff * 8);
        const itemCount = Math.round(4 + diff * 6);

        return {
          containerCapacity,
          itemCount,
        };
      }

      default:
        return { effectiveDifficulty: diff };
    }
  }
}
