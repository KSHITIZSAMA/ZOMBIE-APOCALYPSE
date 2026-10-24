import { describe, it, expect } from 'vitest';
import { EventManager } from '../src/core/EventManager.js';
import { createRNG } from '../src/utils/rng.js';
import { Inventory } from '../src/core/Inventory.js';
import { Player } from '../src/entities/Player.js';

describe('EventManager', () => {
  it('generates identical event schedules from the same seed', () => {
    const rng1 = createRNG('test_apocalypse_seed_42');
    const rng2 = createRNG('test_apocalypse_seed_42');

    const em1 = new EventManager(rng1);
    const em2 = new EventManager(rng2);

    expect(em1.outbreakDay).toBe(em2.outbreakDay);
    expect(em1.scheduledEvents.length).toBe(em2.scheduledEvents.length);

    for (let i = 0; i < em1.scheduledEvents.length; i++) {
      expect(em1.scheduledEvents[i].eventId).toBe(em2.scheduledEvents[i].eventId);
      expect(em1.scheduledEvents[i].day).toBe(em2.scheduledEvents[i].day);
      expect(em1.scheduledEvents[i].hour).toBe(em2.scheduledEvents[i].hour);
    }
  });

  it('schedules at least 3 distinct warning events prior to outbreak day', () => {
    const rng = createRNG('seed_alpha');
    const em = new EventManager(rng);

    expect(em.scheduledEvents.length).toBeGreaterThanOrEqual(3);
    for (const evt of em.scheduledEvents) {
      expect(evt.day).toBeLessThan(em.outbreakDay);
    }
  });

  it('detects due events only when clock reaches scheduled time', () => {
    const rng = createRNG('seed_alpha');
    const em = new EventManager(rng);

    const first = em.scheduledEvents[0];

    // Before scheduled time
    expect(em.getDueEvent(first.day - 1, first.hour)).toBeNull();

    // At scheduled time
    const due = em.getDueEvent(first.day, first.hour);
    expect(due).not.toBeNull();
    expect(due.id).toBe(first.eventId);
  });

  it('resolves choices with real game state consequences', () => {
    const rng = createRNG('seed_alpha');
    const em = new EventManager(rng);

    const mockGame = {
      worldStage: 'normal',
      inventory: new Inventory(10),
      money: 500,
      showNotification: () => {},
    };

    // Resolve choice 'check_supplies' on 'suspicious_broadcast'
    const res = em.resolveEvent('suspicious_broadcast', 'check_supplies', mockGame);
    expect(res.success).toBe(true);
    expect(mockGame.worldStage).toBe('early_warning');
    expect(mockGame.inventory.hasItem('canned_food', 1)).toBe(true);
  });

  it('prevents duplicate event completion or duplicate rewards', () => {
    const rng = createRNG('seed_alpha');
    const em = new EventManager(rng);

    const mockGame = {
      worldStage: 'normal',
      inventory: new Inventory(10),
      money: 500,
      showNotification: () => {},
    };

    em.resolveEvent('suspicious_broadcast', 'check_supplies', mockGame);
    expect(mockGame.inventory.getItemCount('canned_food')).toBe(1);

    // Attempt second resolution
    const duplicate = em.resolveEvent('suspicious_broadcast', 'check_supplies', mockGame);
    expect(duplicate.success).toBe(false);
    expect(mockGame.inventory.getItemCount('canned_food')).toBe(1); // Not duplicated!
  });
});
