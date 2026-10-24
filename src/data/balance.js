/**
 * Centralized game balance configuration.
 * All tunable gameplay values in one place.
 */

export const BALANCE = {
  // --- Simulation ---
  /** Fixed simulation timestep in milliseconds */
  SIMULATION_TIMESTEP_MS: 16.667, // ~60 Hz

  /** Max simulation catchup per frame to prevent spiral of death */
  MAX_FRAME_TIME_MS: 100,

  // --- Time Scale ---
  /** How many game-minutes pass per real second */
  GAME_MINUTES_PER_REAL_SECOND: 1,

  /** Hours of game time a normal sleep advances */
  SLEEP_HOURS: 8,

  // --- Movement ---
  /** Player walking speed in world units per second */
  PLAYER_SPEED: 120,

  // --- Economy ---
  /** Starting money for a new game */
  INITIAL_MONEY: 500,

  // --- Survival Needs (rates per game-hour) ---
  HUNGER_RATE: 4.17,   // ~100 over 24h
  THIRST_RATE: 5.56,   // ~100 over 18h
  FATIGUE_RATE: 6.25,  // ~100 over 16h

  // --- Jobs ---
  /** Default job duration in game-hours */
  DEFAULT_JOB_DURATION_HOURS: 4,

  // --- Farming ---
  /** Default crop growth time in game-hours */
  DEFAULT_CROP_GROWTH_HOURS: 48,

  // --- Outbreak ---
  /** Earliest possible outbreak day (inclusive) */
  OUTBREAK_DAY_MIN: 14,
  /** Latest possible outbreak day (inclusive) */
  OUTBREAK_DAY_MAX: 30,

  /** Minimum warning events required before outbreak */
  MIN_WARNINGS_BEFORE_OUTBREAK: 3,

  // --- Zombies & Combat ---
  ZOMBIE_HEALTH: 30,
  ZOMBIE_SPEED: 40,
  ZOMBIE_DAMAGE: 12,
  ZOMBIE_ATTACK_RANGE: 35,
  ZOMBIE_ATTACK_COOLDOWN: 1.2,
  ZOMBIE_AGRO_RANGE: 320,
  PLAYER_ATTACK_RANGE: 48,
  PLAYER_ATTACK_COOLDOWN: 0.45,
  PLAYER_MELEE_DAMAGE: 15,
  BARRICADE_WOOD_COST: 2,
  BARRICADE_MAX_LEVEL: 3,

  // --- Inventory ---
  INVENTORY_CAPACITY: 20,

  // --- Traits ---
  MAX_NEGATIVE_TRAITS: 3,
  MAX_NEGATIVE_TRAIT_POINTS: 6,

  // --- World ---
  /** World width in world units */
  WORLD_WIDTH: 3000,
  /** Ground Y position from top of world */
  GROUND_Y: 500,
  /** World height for camera bounds */
  WORLD_HEIGHT: 700,

  // --- Starting time ---
  START_HOUR: 6,
  START_MINUTE: 0,
  START_DAY: 1,
};

/** Art direction color palette */
export const PALETTE = {
  NIGHT_BG:       '#394653',
  FOG:            '#78838A',
  OUTLINE:        '#292927',
  EARTH:          '#75604B',
  GRASS:          '#68745A',
  INTERIOR_LIGHT: '#E6AD61',
  PAPER:          '#E6E0D2',
  DANGER:         '#A94B43',

  // Extended palette for rendering
  SKY_TOP:        '#5a7a9a',
  SKY_BOTTOM:     '#8fa5b8',
  SKY_NIGHT_TOP:  '#1a2230',
  SKY_NIGHT_BOTTOM: '#394653',
  CLOUD:          'rgba(230, 224, 210, 0.25)',
  SUN:            '#E6D4A8',
  MOON:           '#c8ccd0',
  GROUND_TOP:     '#68745A',
  GROUND_MID:     '#5a6650',
  GROUND_BOTTOM:  '#75604B',
  SKIN_DEFAULT:   '#E6CBA8',
  HAIR_DEFAULT:   '#4a3728',
  SHIRT_DEFAULT:  '#5a7090',
  PANTS_DEFAULT:  '#3a4555',
  SHOE_DEFAULT:   '#3a3530',
};
