/**
 * NeedsSystem — Tracks Hunger, Thirst, Fatigue, and Health.
 * Rates advance consistently with world time and are adjusted by survivor traits.
 */

import { BALANCE } from '../data/balance.js';

export class NeedsSystem {
  constructor() {
    /** @type {number} 0 = full, 100 = starving */
    this.hunger = 15;

    /** @type {number} 0 = quenched, 100 = dehydrated */
    this.thirst = 15;

    /** @type {number} 0 = refreshed, 100 = exhausted */
    this.fatigue = 10;

    /** @type {number} 0 = deceased, 100 = healthy */
    this.health = 100;
  }

  /**
   * Advance survival needs based on elapsed game hours and active traits.
   * @param {number} hours - In-game hours elapsed.
   * @param {string[]} [traits] - Active survivor trait IDs.
   */
  advanceHours(hours, traits = []) {
    if (hours <= 0) return;

    // Trait rate multipliers
    let hungerMult = 1.0;
    let thirstMult = 1.0;
    let fatigueMult = 1.0;

    if (traits.includes('hardy')) {
      hungerMult *= 0.85;
    }
    if (traits.includes('high_metabolism')) {
      hungerMult *= 1.20;
      thirstMult *= 1.20;
    }
    if (traits.includes('frail')) {
      fatigueMult *= 1.20;
    }
    if (traits.includes('heavy_sleeper')) {
      fatigueMult *= 1.10;
    }

    // Accumulate needs
    this.hunger = Math.min(100, this.hunger + BALANCE.HUNGER_RATE * hungerMult * hours);
    this.thirst = Math.min(100, this.thirst + BALANCE.THIRST_RATE * thirstMult * hours);
    this.fatigue = Math.min(100, this.fatigue + BALANCE.FATIGUE_RATE * fatigueMult * hours);

    // Extreme starvation or dehydration damages health
    if (this.hunger >= 95 || this.thirst >= 95) {
      const damageRate = (this.hunger >= 95 ? 2.5 : 0) + (this.thirst >= 95 ? 3.5 : 0);
      this.health = Math.max(0, this.health - damageRate * hours);
    } else if (this.hunger < 50 && this.thirst < 50 && this.fatigue < 50 && this.health < 100) {
      // Natural slow health regeneration when well maintained
      this.health = Math.min(100, this.health + 1.5 * hours);
    }
  }

  /**
   * Apply effects from consuming an item.
   * @param {object} item - Item definition from items.js
   * @returns {boolean} Whether item had consumable effects
   */
  consume(item) {
    if (!item?.effects) return false;

    if (item.effects.hunger) {
      // Negative effect reduces hunger
      this.hunger = Math.max(0, Math.min(100, this.hunger + item.effects.hunger));
    }
    if (item.effects.thirst) {
      this.thirst = Math.max(0, Math.min(100, this.thirst + item.effects.thirst));
    }
    if (item.effects.fatigue) {
      this.fatigue = Math.max(0, Math.min(100, this.fatigue + item.effects.fatigue));
    }
    if (item.effects.health) {
      this.health = Math.max(0, Math.min(100, this.health + item.effects.health));
    }

    return true;
  }

  /**
   * Sleep to restore fatigue.
   * @param {number} hours - Hours of sleep.
   * @param {string[]} [traits]
   */
  sleep(hours, traits = []) {
    // Restores fatigue significantly
    this.fatigue = 0;

    // Hunger and thirst still accrue during sleep, but at half rate (resting metabolism)
    let hungerMult = 0.5;
    let thirstMult = 0.5;

    if (traits.includes('hardy')) hungerMult *= 0.85;
    if (traits.includes('high_metabolism')) {
      hungerMult *= 1.20;
      thirstMult *= 1.20;
    }

    this.hunger = Math.min(100, this.hunger + BALANCE.HUNGER_RATE * hungerMult * hours);
    this.thirst = Math.min(100, this.thirst + BALANCE.THIRST_RATE * thirstMult * hours);

    // Healing during restful sleep
    this.health = Math.min(100, this.health + 2.0 * hours);
  }

  /**
   * Check if player is alive.
   * @returns {boolean}
   */
  isAlive() {
    return this.health > 0;
  }

  /**
   * Serialize for saving.
   * @returns {object}
   */
  serialize() {
    return {
      hunger: this.hunger,
      thirst: this.thirst,
      fatigue: this.fatigue,
      health: this.health,
    };
  }

  /**
   * Restore saved data.
   * @param {object} data
   */
  deserialize(data) {
    if (!data) return;
    this.hunger = data.hunger ?? this.hunger;
    this.thirst = data.thirst ?? this.thirst;
    this.fatigue = data.fatigue ?? this.fatigue;
    this.health = data.health ?? this.health;
  }
}
