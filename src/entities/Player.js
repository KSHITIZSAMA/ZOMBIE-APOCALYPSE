/**
 * Player — Player entity with position, movement, traits, and animation state.
 * Supports character customization (hair, clothing, skin, traits, occupation).
 */

import { BALANCE } from '../data/balance.js';
import { getTrait } from '../data/traits.js';

export class Player {
  constructor() {
    /** @type {number} World X position */
    this.x = BALANCE.WORLD_WIDTH / 2;
    /** @type {number} World Y position (feet on ground) */
    this.y = BALANCE.GROUND_Y;

    /** @type {number} Current horizontal velocity */
    this.vx = 0;

    /** @type {number} 1 = facing right, -1 = facing left */
    this.facing = 1;

    /** @type {boolean} Whether the player is currently walking */
    this.isWalking = false;

    /** @type {number} Walk animation timer (in seconds) */
    this.walkTime = 0;

    /** @type {number} Walk animation cycle duration in seconds */
    this.walkCycleDuration = 0.6;

    // Character identity & customization
    /** @type {string} */
    this.name = 'Survivor';
    /** @type {string} */
    this.occupation = 'farmer';
    /** @type {string[]} */
    this.traits = [];

    // Character appearance
    /** @type {string} */
    this.skinColor = '#E6CBA8';
    /** @type {string} */
    this.hairColor = '#4a3728';
    /** @type {'short'|'messy'|'ponytail'|'bald'} */
    this.hairStyle = 'messy';
    /** @type {string} */
    this.shirtColor = '#5a7090';
    /** @type {string} */
    this.pantsColor = '#3a4555';
    /** @type {string} */
    this.shoeColor = '#3a3530';
    /** @type {'casual'|'workwear'|'jacket'} */
    this.clothingStyle = 'casual';

    /** @type {number} Movement speed modifier computed from traits */
    this.speedModifier = 1.0;

    // Melee Combat
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackDuration = 0.22;
    this.attackCooldownTimer = 0;
    this.attackCooldown = BALANCE.PLAYER_ATTACK_COOLDOWN;
    this.attackReach = BALANCE.PLAYER_ATTACK_RANGE;
    this.attackDamage = BALANCE.PLAYER_MELEE_DAMAGE;
    this.justAttacked = false;

    this._recomputeTraits();
  }

  /**
   * Trigger a melee swing attack.
   * @returns {boolean} True if attack successfully initiated.
   */
  attack() {
    if (this.attackCooldownTimer > 0) return false;
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.attackCooldownTimer = this.attackCooldown;
    this.justAttacked = true;
    return true;
  }

  /**
   * Get normalized swing animation progress [0, 1].
   * @returns {number}
   */
  getAttackProgress() {
    if (!this.isAttacking) return 0;
    return 1 - (this.attackTimer / this.attackDuration);
  }

  /**
   * Recompute passive modifiers from active traits.
   * @private
   */
  _recomputeTraits() {
    let speedMult = 1.0;
    for (const traitId of this.traits) {
      const trait = getTrait(traitId);
      if (trait?.speedMultiplier) {
        speedMult *= trait.speedMultiplier;
      }
    }
    this.speedModifier = speedMult;
  }

  /**
   * Set player character configuration from character creator.
   * @param {object} config
   */
  setConfiguration(config) {
    if (!config) return;
    if (config.name) this.name = config.name;
    if (config.occupation) this.occupation = config.occupation;
    if (Array.isArray(config.traits)) this.traits = [...config.traits];
    if (config.skinColor) this.skinColor = config.skinColor;
    if (config.hairColor) this.hairColor = config.hairColor;
    if (config.hairStyle) this.hairStyle = config.hairStyle;
    if (config.shirtColor) this.shirtColor = config.shirtColor;
    if (config.pantsColor) this.pantsColor = config.pantsColor;
    if (config.shoeColor) this.shoeColor = config.shoeColor;
    if (config.clothingStyle) this.clothingStyle = config.clothingStyle;

    this._recomputeTraits();
  }

  /**
   * Update player state from input.
   * @param {import('../core/Input.js').Input} input
   * @param {number} dt - Delta time in seconds.
   * @param {number} [customWorldWidth] - Current scene bounds width.
   * @param {number} [customGroundY] - Current scene ground height.
   */
  update(input, dt, customWorldWidth = BALANCE.WORLD_WIDTH, customGroundY = BALANCE.GROUND_Y) {
    // Advance combat timers
    this.justAttacked = false;
    this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    if (this.attackTimer <= 0) {
      this.isAttacking = false;
    }

    if (input && typeof input.isAttacking === 'function' && input.isAttacking()) {
      if (this.attackCooldownTimer <= 0) {
        this.attack();
      }
    }

    let moveDir = 0;
    if (input && input.isMovingLeft()) moveDir -= 1;
    if (input && input.isMovingRight()) moveDir += 1;

    const baseSpeed = BALANCE.PLAYER_SPEED * this.speedModifier;
    this.vx = moveDir * baseSpeed;
    this.isWalking = moveDir !== 0;

    if (moveDir !== 0) {
      this.facing = moveDir;
    }

    // Update position
    this.x += this.vx * dt;

    // Clamp to world bounds
    const margin = 30;
    this.x = Math.max(margin, Math.min(this.x, customWorldWidth - margin));

    // Keep on ground
    this.y = customGroundY;

    // Advance walk animation
    if (this.isWalking) {
      this.walkTime += dt;
    } else {
      this.walkTime = 0;
    }
  }

  /**
   * Get the walk cycle phase [0, 1].
   * @returns {number}
   */
  getWalkPhase() {
    if (!this.isWalking) return 0;
    return (this.walkTime % this.walkCycleDuration) / this.walkCycleDuration;
  }

  /**
   * Get appearance object for renderer.
   * @returns {object}
   */
  getAppearance() {
    return {
      skinColor: this.skinColor,
      hairColor: this.hairColor,
      hairStyle: this.hairStyle,
      shirtColor: this.shirtColor,
      pantsColor: this.pantsColor,
      shoeColor: this.shoeColor,
      clothingStyle: this.clothingStyle,
    };
  }

  /**
   * Serialize for saving.
   * @returns {object}
   */
  serialize() {
    return {
      x: this.x,
      y: this.y,
      facing: this.facing,
      name: this.name,
      occupation: this.occupation,
      traits: [...this.traits],
      skinColor: this.skinColor,
      hairColor: this.hairColor,
      hairStyle: this.hairStyle,
      shirtColor: this.shirtColor,
      pantsColor: this.pantsColor,
      shoeColor: this.shoeColor,
      clothingStyle: this.clothingStyle,
    };
  }

  /**
   * Restore from saved data.
   * @param {object} data
   */
  deserialize(data) {
    if (data) {
      this.x = data.x ?? this.x;
      this.y = data.y ?? this.y;
      this.facing = data.facing ?? 1;
      this.name = data.name ?? 'Survivor';
      this.occupation = data.occupation ?? 'farmer';
      this.traits = Array.isArray(data.traits) ? [...data.traits] : [];
      this.skinColor = data.skinColor ?? this.skinColor;
      this.hairColor = data.hairColor ?? this.hairColor;
      this.hairStyle = data.hairStyle ?? 'messy';
      this.shirtColor = data.shirtColor ?? this.shirtColor;
      this.pantsColor = data.pantsColor ?? this.pantsColor;
      this.shoeColor = data.shoeColor ?? this.shoeColor;
      this.clothingStyle = data.clothingStyle ?? 'casual';
      this._recomputeTraits();
    }
  }
}
