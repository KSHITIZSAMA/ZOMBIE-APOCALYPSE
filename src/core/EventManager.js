/**
 * EventManager — Seeded narrative event scheduling, trigger detection,
 * choice consequence execution, and sleep-skip protection.
 */

import { STORY_EVENTS } from '../data/events.js';
import { BALANCE } from '../data/balance.js';

export class EventManager {
  /**
   * @param {import('../utils/rng.js').createRNG} rng
   */
  constructor(rng = null) {
    this.rng = rng;

    /** @type {Array<{eventId: string, day: number, hour: number, completed: boolean}>} */
    this.scheduledEvents = [];

    /** @type {Set<string>} Completed event IDs */
    this.completedEventIds = new Set();

    /** @type {Record<string, string>} eventId -> choiceId */
    this.decisionsMade = {};

    /** @type {number} Deterministically chosen outbreak day */
    this.outbreakDay = 18;

    if (rng) {
      this.initSchedule(rng);
    }
  }

  /**
   * Deterministically generate the pre-outbreak warning schedule from RNG.
   * @param {import('../utils/rng.js').createRNG} rng
   */
  initSchedule(rng) {
    this.rng = rng;
    this.scheduledEvents = [];
    this.completedEventIds.clear();
    this.decisionsMade = {};

    // Outbreak day between OUTBREAK_DAY_MIN (14) and OUTBREAK_DAY_MAX (30)
    const span = BALANCE.OUTBREAK_DAY_MAX - BALANCE.OUTBREAK_DAY_MIN;
    this.outbreakDay = BALANCE.OUTBREAK_DAY_MIN + Math.floor(rng.float() * (span + 1));

    // Schedule Warning 1: Day 2 or 3
    const day1 = 2 + Math.floor(rng.float() * 2);
    const hour1 = 16 + Math.floor(rng.float() * 4); // 16 to 19
    this.scheduledEvents.push({
      eventId: 'suspicious_broadcast',
      day: day1,
      hour: hour1,
      completed: false,
    });

    // Schedule Warning 2: Day 5 or 6
    const day2 = 5 + Math.floor(rng.float() * 2);
    const hour2 = 9 + Math.floor(rng.float() * 5); // 9 to 13
    this.scheduledEvents.push({
      eventId: 'neighbor_caleb_request',
      day: day2,
      hour: hour2,
      completed: false,
    });

    // Schedule Warning 3: Day 8 or 9
    const day3 = 8 + Math.floor(rng.float() * 2);
    const hour3 = 13 + Math.floor(rng.float() * 5); // 13 to 17
    this.scheduledEvents.push({
      eventId: 'roadblock_alert',
      day: day3,
      hour: hour3,
      completed: false,
    });

    // Sort chronologically
    this.scheduledEvents.sort((a, b) => {
      const aTime = a.day * 24 + a.hour;
      const bTime = b.day * 24 + b.hour;
      return aTime - bTime;
    });
  }

  /**
   * Convert day and hour to absolute hours from start of run.
   * @param {number} day
   * @param {number} hour
   * @returns {number}
   */
  timeToHours(day, hour) {
    return (day - 1) * 24 + hour;
  }

  /**
   * Check if any scheduled event is currently due for triggering.
   * @param {number} currentDay
   * @param {number} currentHour
   * @returns {object|null} Next ready event definition or null
   */
  getDueEvent(currentDay, currentHour) {
    const currentTotalHours = this.timeToHours(currentDay, currentHour);

    for (const scheduled of this.scheduledEvents) {
      if (!scheduled.completed && !this.completedEventIds.has(scheduled.eventId)) {
        const eventTotalHours = this.timeToHours(scheduled.day, scheduled.hour);
        if (currentTotalHours >= eventTotalHours) {
          const eventDef = Object.values(STORY_EVENTS).find((e) => e.id === scheduled.eventId);
          if (eventDef) return eventDef;
        }
      }
    }

    // Check Outbreak Event
    if (this.isOutbreakTriggered(currentDay, currentHour) && !this.completedEventIds.has('outbreak_emergence')) {
      return STORY_EVENTS.OUTBREAK_EMERGENCE;
    }

    return null;
  }

  /**
   * Check whether outbreak conditions are met.
   * @param {number} currentDay
   * @param {number} [currentHour]
   * @returns {boolean}
   */
  isOutbreakTriggered(currentDay, currentHour = 18) {
    if (this.completedEventIds.has('outbreak_emergence')) return true;
    const isDue = currentDay > this.outbreakDay || (currentDay === this.outbreakDay && currentHour >= 18);
    return isDue && this.getCompletedWarningCount() >= BALANCE.MIN_WARNINGS_BEFORE_OUTBREAK;
  }

  /**
   * Find any scheduled event that would be skipped during a sleep/advance duration.
   * Returns earliest event inside the interval to protect against skipping.
   * @param {number} startDay
   * @param {number} startHour
   * @param {number} hoursToAdvance
   * @returns {{ event: object, hoursUntilEvent: number, targetDay: number, targetHour: number } | null}
   */
  findEventInInterval(startDay, startHour, hoursToAdvance) {
    const startTotal = this.timeToHours(startDay, startHour);
    const endTotal = startTotal + hoursToAdvance;

    for (const scheduled of this.scheduledEvents) {
      if (!scheduled.completed && !this.completedEventIds.has(scheduled.eventId)) {
        const eventTotal = this.timeToHours(scheduled.day, scheduled.hour);
        if (eventTotal > startTotal && eventTotal <= endTotal) {
          const eventDef = Object.values(STORY_EVENTS).find((e) => e.id === scheduled.eventId);
          if (eventDef) {
            return {
              event: eventDef,
              hoursUntilEvent: eventTotal - startTotal,
              targetDay: scheduled.day,
              targetHour: scheduled.hour,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Mark an event as completed and execute the chosen consequence.
   * Prevents duplicate execution.
   * @param {string} eventId
   * @param {string} choiceId
   * @param {object} game
   * @returns {{ success: boolean, outcomeText: string }}
   */
  resolveEvent(eventId, choiceId, game) {
    if (this.completedEventIds.has(eventId)) {
      return { success: false, outcomeText: 'Event has already been completed.' };
    }

    const eventDef = Object.values(STORY_EVENTS).find((e) => e.id === eventId);
    if (!eventDef) {
      return { success: false, outcomeText: 'Event definition not found.' };
    }

    const choice = eventDef.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return { success: false, outcomeText: 'Choice not found.' };
    }

    // Mark completed
    this.completedEventIds.add(eventId);
    this.decisionsMade[eventId] = choiceId;

    const scheduled = this.scheduledEvents.find((s) => s.eventId === eventId);
    if (scheduled) scheduled.completed = true;

    // Apply consequence once
    if (choice.consequence && typeof choice.consequence === 'function') {
      choice.consequence(game);
    }

    return {
      success: true,
      outcomeText: choice.outcomeText,
    };
  }

  /**
   * Check count of completed warning events.
   * @returns {number}
   */
  getCompletedWarningCount() {
    return this.completedEventIds.size;
  }

  /**
   * Serialize for versioned save data.
   * @returns {object}
   */
  serialize() {
    return {
      outbreakDay: this.outbreakDay,
      scheduledEvents: this.scheduledEvents.map((s) => ({ ...s })),
      completedEventIds: Array.from(this.completedEventIds),
      decisionsMade: { ...this.decisionsMade },
    };
  }

  /**
   * Restore from saved data.
   * @param {object} data
   */
  deserialize(data) {
    if (!data) return;
    this.outbreakDay = data.outbreakDay ?? this.outbreakDay;
    if (Array.isArray(data.scheduledEvents)) {
      this.scheduledEvents = data.scheduledEvents.map((s) => ({ ...s }));
    }
    if (Array.isArray(data.completedEventIds)) {
      this.completedEventIds = new Set(data.completedEventIds);
    }
    this.decisionsMade = data.decisionsMade ? { ...data.decisionsMade } : {};
  }
}
