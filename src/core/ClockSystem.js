/**
 * ClockSystem — Authoritative world clock.
 * One real second = one game minute (configurable via balance).
 * All time advancement flows through this single system.
 */

import { BALANCE } from '../data/balance.js';

export class ClockSystem {
  constructor() {
    /** @type {number} Current game day (1-indexed) */
    this.day = BALANCE.START_DAY;

    /** @type {number} Current hour (0-23) */
    this.hour = BALANCE.START_HOUR;

    /** @type {number} Current minute (0-59) */
    this.minute = BALANCE.START_MINUTE;

    /** @type {boolean} Whether the clock is paused */
    this.paused = false;

    /**
     * Accumulated fractional minutes from real-time advancement.
     * @type {number}
     */
    this._fractionalMinutes = 0;
  }

  /**
   * Advance the clock by a real-time delta (in seconds).
   * Called every simulation tick from the game loop.
   * @param {number} dtSeconds - Real elapsed seconds since last tick.
   * @returns {{ minutesAdvanced: number, dayChanged: boolean }} Change info.
   */
  advanceByRealTime(dtSeconds) {
    if (this.paused) return { minutesAdvanced: 0, dayChanged: false };
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
      return { minutesAdvanced: 0, dayChanged: false };
    }

    const gameMinutes = dtSeconds * BALANCE.GAME_MINUTES_PER_REAL_SECOND;
    return this._advanceMinutes(gameMinutes);
  }

  /**
   * Advance by a specified number of game-minutes.
   * Used for sleep, job completion, etc.
   * @param {number} minutes - Game minutes to advance.
   * @returns {{ minutesAdvanced: number, dayChanged: boolean }}
   */
  advanceByGameMinutes(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) {
      return { minutesAdvanced: 0, dayChanged: false };
    }
    return this._advanceMinutes(minutes);
  }

  /**
   * Internal: advance clock by fractional game minutes.
   * @param {number} mins
   * @returns {{ minutesAdvanced: number, dayChanged: boolean }}
   * @private
   */
  _advanceMinutes(mins) {
    this._fractionalMinutes += mins;
    const wholeMinutes = Math.floor(this._fractionalMinutes);
    this._fractionalMinutes -= wholeMinutes;

    let dayChanged = false;
    let totalMins = this.hour * 60 + this.minute + wholeMinutes;

    if (totalMins >= 1440) {
      const daysToAdd = Math.floor(totalMins / 1440);
      this.day += daysToAdd;
      totalMins = totalMins % 1440;
      dayChanged = true;
    }

    this.hour = Math.floor(totalMins / 60);
    this.minute = totalMins % 60;

    return { minutesAdvanced: wholeMinutes, dayChanged };
  }

  /**
   * Pause the clock.
   */
  pause() {
    this.paused = true;
  }

  /**
   * Resume the clock.
   */
  resume() {
    this.paused = false;
  }

  /**
   * Get total elapsed game-minutes since day 1 00:00.
   * @returns {number}
   */
  getTotalMinutes() {
    return (this.day - 1) * 1440 + this.hour * 60 + this.minute;
  }

  /**
   * Get a formatted time string (HH:MM).
   * @returns {string}
   */
  getTimeString() {
    const h = String(this.hour).padStart(2, '0');
    const m = String(this.minute).padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Get a formatted day string.
   * @returns {string}
   */
  getDayString() {
    return `Day ${this.day}`;
  }

  /**
   * Get the time-of-day factor for lighting (0 = midnight, 0.5 = noon, 1 = midnight).
   * Returns a value in [0, 1] representing how much of "day" it is.
   * 0 at midnight, 1 at noon.
   * @returns {number}
   */
  getDaylightFactor() {
    const totalMins = this.hour * 60 + this.minute;
    // Sunrise ~6, sunset ~20 → peak noon at 13:00
    // Simple sinusoidal model
    const t = totalMins / 1440; // 0-1 over the day
    // Map to a curve: peak at 0.5417 (13:00), dark at 0 and 1
    const shifted = (t - 0.25) * Math.PI * 2; // Shift so 6:00 is sunrise
    const daylight = Math.sin(shifted);
    return Math.max(0, daylight);
  }

  /**
   * Check if it's currently "night" (before 6 AM or after 20:00).
   * @returns {boolean}
   */
  isNight() {
    return this.hour < 6 || this.hour >= 20;
  }

  /**
   * Serialize for saving.
   * @returns {object}
   */
  serialize() {
    return {
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      fractionalMinutes: this._fractionalMinutes,
    };
  }

  /**
   * Restore from saved data.
   * @param {object} data
   */
  deserialize(data) {
    if (data) {
      this.day = data.day ?? BALANCE.START_DAY;
      this.hour = data.hour ?? BALANCE.START_HOUR;
      this.minute = data.minute ?? BALANCE.START_MINUTE;
      this._fractionalMinutes = data.fractionalMinutes ?? 0;
    }
  }
}
