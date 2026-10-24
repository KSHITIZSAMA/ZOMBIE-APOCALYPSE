/**
 * Tests for ClockSystem — World clock advancement, pause/resume, frame-rate independence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClockSystem } from '../src/core/ClockSystem.js';

describe('ClockSystem', () => {
  let clock;

  beforeEach(() => {
    clock = new ClockSystem();
  });

  describe('initial state', () => {
    it('starts at day 1, 06:00', () => {
      expect(clock.day).toBe(1);
      expect(clock.hour).toBe(6);
      expect(clock.minute).toBe(0);
    });

    it('is not paused initially', () => {
      expect(clock.paused).toBe(false);
    });

    it('formats time correctly', () => {
      expect(clock.getTimeString()).toBe('06:00');
      expect(clock.getDayString()).toBe('Day 1');
    });
  });

  describe('advanceByRealTime', () => {
    it('advances 1 game-minute per real second (default time scale)', () => {
      clock.advanceByRealTime(1);
      expect(clock.minute).toBe(1);
      expect(clock.hour).toBe(6);
    });

    it('advances multiple minutes', () => {
      clock.advanceByRealTime(30);
      expect(clock.minute).toBe(30);
      expect(clock.hour).toBe(6);
    });

    it('rolls over hours', () => {
      clock.advanceByRealTime(60); // 60 minutes
      expect(clock.hour).toBe(7);
      expect(clock.minute).toBe(0);
    });

    it('rolls over days', () => {
      // Start at 06:00, advance 18 hours (1080 minutes) to reach midnight + more
      clock.advanceByRealTime(1440); // Full day = 1440 minutes
      expect(clock.day).toBe(2);
      expect(clock.hour).toBe(6);
      expect(clock.minute).toBe(0);
    });

    it('handles fractional seconds accumulation', () => {
      // Advance by 0.5 seconds 4 times = 2 seconds = 2 game minutes
      for (let i = 0; i < 4; i++) {
        clock.advanceByRealTime(0.5);
      }
      expect(clock.minute).toBe(2);
    });
  });

  describe('advanceByGameMinutes', () => {
    it('advances specified game-minutes', () => {
      clock.advanceByGameMinutes(120); // 2 hours
      expect(clock.hour).toBe(8);
      expect(clock.minute).toBe(0);
    });

    it('correctly advances across day boundary', () => {
      clock.advanceByGameMinutes(18 * 60); // 18 hours from 06:00 = 00:00 next day
      expect(clock.day).toBe(2);
      expect(clock.hour).toBe(0);
      expect(clock.minute).toBe(0);
    });

    it('advances multiple days', () => {
      clock.advanceByGameMinutes(3 * 1440); // 3 full days
      expect(clock.day).toBe(4);
      expect(clock.hour).toBe(6);
      expect(clock.minute).toBe(0);
    });
  });

  describe('pause and resume', () => {
    it('does not advance when paused', () => {
      clock.pause();
      const result = clock.advanceByRealTime(100);
      expect(result.minutesAdvanced).toBe(0);
      expect(clock.minute).toBe(0);
      expect(clock.hour).toBe(6);
    });

    it('resumes advancement after unpause', () => {
      clock.pause();
      clock.advanceByRealTime(100);
      clock.resume();
      clock.advanceByRealTime(5);
      expect(clock.minute).toBe(5);
    });

    it('pause state is correct', () => {
      expect(clock.paused).toBe(false);
      clock.pause();
      expect(clock.paused).toBe(true);
      clock.resume();
      expect(clock.paused).toBe(false);
    });
  });

  describe('frame-rate independence', () => {
    it('produces same result regardless of tick frequency', () => {
      // Clock A: 60 ticks of 1/60 second
      const clockA = new ClockSystem();
      for (let i = 0; i < 60; i++) {
        clockA.advanceByRealTime(1 / 60);
      }

      // Clock B: 1 tick of 1 second
      const clockB = new ClockSystem();
      clockB.advanceByRealTime(1);

      // Both should have advanced ~1 game-minute
      expect(clockA.minute).toBe(clockB.minute);
      expect(clockA.hour).toBe(clockB.hour);
    });

    it('accumulates fractional minutes correctly across many small ticks', () => {
      // 600 ticks of 1/60 = 10 real seconds = 10 game minutes
      for (let i = 0; i < 600; i++) {
        clock.advanceByRealTime(1 / 60);
      }
      expect(clock.minute).toBe(10);
      expect(clock.hour).toBe(6);
    });
  });

  describe('invalid inputs', () => {
    it('handles negative delta time gracefully', () => {
      const result = clock.advanceByRealTime(-1);
      expect(result.minutesAdvanced).toBe(0);
      expect(clock.minute).toBe(0);
    });

    it('handles NaN delta time gracefully', () => {
      const result = clock.advanceByRealTime(NaN);
      expect(result.minutesAdvanced).toBe(0);
    });

    it('handles Infinity delta time gracefully', () => {
      const result = clock.advanceByRealTime(Infinity);
      expect(result.minutesAdvanced).toBe(0);
    });

    it('handles negative game-minutes gracefully', () => {
      const result = clock.advanceByGameMinutes(-60);
      expect(result.minutesAdvanced).toBe(0);
    });
  });

  describe('getTotalMinutes', () => {
    it('returns correct total from start', () => {
      // Day 1, 06:00 = (1-1)*1440 + 6*60 + 0 = 360
      expect(clock.getTotalMinutes()).toBe(360);
    });

    it('tracks correctly after advancement', () => {
      clock.advanceByGameMinutes(100);
      // 360 + 100 = 460
      expect(clock.getTotalMinutes()).toBe(460);
    });
  });

  describe('daylight and night', () => {
    it('reports night before 6 AM', () => {
      clock.hour = 3;
      expect(clock.isNight()).toBe(true);
    });

    it('reports day at noon', () => {
      clock.hour = 12;
      expect(clock.isNight()).toBe(false);
    });

    it('reports night after 8 PM', () => {
      clock.hour = 21;
      expect(clock.isNight()).toBe(true);
    });

    it('getDaylightFactor is between 0 and 1', () => {
      for (let h = 0; h < 24; h++) {
        clock.hour = h;
        clock.minute = 0;
        const f = clock.getDaylightFactor();
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('serialization', () => {
    it('serializes and deserializes correctly', () => {
      clock.advanceByGameMinutes(500);
      const data = clock.serialize();

      const clock2 = new ClockSystem();
      clock2.deserialize(data);

      expect(clock2.day).toBe(clock.day);
      expect(clock2.hour).toBe(clock.hour);
      expect(clock2.minute).toBe(clock.minute);
    });

    it('handles missing data gracefully', () => {
      clock.deserialize(null);
      // Should remain at defaults
      expect(clock.day).toBe(1);
      expect(clock.hour).toBe(6);
    });
  });

  describe('advanceHours & analog clock hand angles', () => {
    it('advances full hours accurately', () => {
      clock.hour = 6;
      clock.minute = 0;
      clock.advanceHours(8); // 8-hour sleep
      expect(clock.hour).toBe(14);
      expect(clock.minute).toBe(0);
    });

    it('advances fractional hours across day boundaries', () => {
      clock.hour = 22;
      clock.minute = 30;
      clock.advanceHours(2.5); // 2 hours 30 mins -> Day 2, 01:00
      expect(clock.day).toBe(2);
      expect(clock.hour).toBe(1);
      expect(clock.minute).toBe(0);
    });

    it('calculates hour hand rotation degrees correctly (30 deg / hour)', () => {
      clock.hour = 12;
      clock.minute = 0;
      expect(clock.getHourHandAngle()).toBe(0);

      clock.hour = 3;
      clock.minute = 0;
      expect(clock.getHourHandAngle()).toBe(90);

      clock.hour = 6;
      clock.minute = 0;
      expect(clock.getHourHandAngle()).toBe(180);

      clock.hour = 6;
      clock.minute = 30; // 6.5 hours = 195 deg
      expect(clock.getHourHandAngle()).toBe(195);
    });

    it('calculates minute hand rotation degrees correctly (6 deg / minute)', () => {
      clock.minute = 0;
      expect(clock.getMinuteHandAngle()).toBe(0);

      clock.minute = 15;
      expect(clock.getMinuteHandAngle()).toBe(90);

      clock.minute = 30;
      expect(clock.getMinuteHandAngle()).toBe(180);

      clock.minute = 45;
      expect(clock.getMinuteHandAngle()).toBe(270);
    });
  });
});
