import { describe, it, expect } from 'vitest';
import { EventManager } from '../src/core/EventManager.js';
import { createRNG } from '../src/utils/rng.js';

describe('Sleep & Scheduled-Event Protection', () => {
  it('detects when an 8-hour sleep would cross a scheduled event', () => {
    const rng = createRNG('seed_beta');
    const em = new EventManager(rng);

    // Set a known scheduled event at Day 2, Hour 18
    em.scheduledEvents = [
      {
        eventId: 'suspicious_broadcast',
        day: 2,
        hour: 18,
        completed: false,
      },
    ];

    // Player sleeps at Day 2, Hour 14 for 8 hours (would end at Day 2, Hour 22)
    // The event is at Hour 18 (4 hours in)
    const pending = em.findEventInInterval(2, 14, 8);

    expect(pending).not.toBeNull();
    expect(pending.event.id).toBe('suspicious_broadcast');
    expect(pending.hoursUntilEvent).toBe(4);
    expect(pending.targetDay).toBe(2);
    expect(pending.targetHour).toBe(18);
  });

  it('allows full sleep when no events are scheduled in the interval', () => {
    const rng = createRNG('seed_beta');
    const em = new EventManager(rng);

    em.scheduledEvents = [
      {
        eventId: 'suspicious_broadcast',
        day: 5,
        hour: 12,
        completed: false,
      },
    ];

    // Player sleeps on Day 1 for 8 hours
    const pending = em.findEventInInterval(1, 22, 8);
    expect(pending).toBeNull();
  });

  it('ignores completed events during sleep check', () => {
    const rng = createRNG('seed_beta');
    const em = new EventManager(rng);

    em.scheduledEvents = [
      {
        eventId: 'suspicious_broadcast',
        day: 2,
        hour: 18,
        completed: true,
      },
    ];
    em.completedEventIds.add('suspicious_broadcast');

    const pending = em.findEventInInterval(2, 14, 8);
    expect(pending).toBeNull();
  });
});
