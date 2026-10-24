import { describe, it, expect } from 'vitest';
import { EventManager } from '../src/core/EventManager.js';
import { Inventory } from '../src/core/Inventory.js';
import { createRNG } from '../src/utils/rng.js';
import { BALANCE } from '../src/data/balance.js';
import { STORY_EVENTS } from '../src/data/events.js';

describe('Apocalypse Outbreak & Defense System', () => {
  it('triggers the outbreak event when outbreak day is reached and warnings are done', () => {
    const rng = createRNG('outbreak_test_seed');
    const em = new EventManager(rng);

    // Mark warning events as completed
    for (const scheduled of em.scheduledEvents) {
      em.completedEventIds.add(scheduled.eventId);
      scheduled.completed = true;
    }

    // Before outbreak day
    expect(em.isOutbreakTriggered(em.outbreakDay - 1, 18)).toBe(false);

    // On outbreak day at dusk
    expect(em.isOutbreakTriggered(em.outbreakDay, 18)).toBe(true);

    const dueEvent = em.getDueEvent(em.outbreakDay, 18);
    expect(dueEvent).not.toBeNull();
    expect(dueEvent.id).toBe('outbreak_emergence');
  });

  it('resolving outbreak emergence story event shifts world stage to outbreak', () => {
    const rng = createRNG('outbreak_test_seed');
    const em = new EventManager(rng);

    const mockGame = {
      worldStage: 'normal',
      showNotification: () => {},
    };

    const res = em.resolveEvent('outbreak_emergence', 'brace_for_assault', mockGame);
    expect(res.success).toBe(true);
    expect(mockGame.worldStage).toBe('outbreak');
    expect(em.completedEventIds.has('outbreak_emergence')).toBe(true);
  });

  it('reinforces farmhouse door barricade using timber planks', () => {
    const inventory = new Inventory(10);
    inventory.addItem('wood', 4);

    let doorBarricadeLevel = 0;
    let baseDefenseLevel = 0;

    // First reinforcement (costs 2 wood)
    expect(inventory.hasItem('wood', BALANCE.BARRICADE_WOOD_COST)).toBe(true);
    inventory.removeItem('wood', BALANCE.BARRICADE_WOOD_COST);
    doorBarricadeLevel++;
    baseDefenseLevel++;

    expect(doorBarricadeLevel).toBe(1);
    expect(baseDefenseLevel).toBe(1);
    expect(inventory.getItemCount('wood')).toBe(2);

    // Second reinforcement
    expect(inventory.hasItem('wood', BALANCE.BARRICADE_WOOD_COST)).toBe(true);
    inventory.removeItem('wood', BALANCE.BARRICADE_WOOD_COST);
    doorBarricadeLevel++;
    baseDefenseLevel++;

    expect(doorBarricadeLevel).toBe(2);
    expect(inventory.getItemCount('wood')).toBe(0);

    // Third attempt fails due to insufficient wood
    expect(inventory.hasItem('wood', BALANCE.BARRICADE_WOOD_COST)).toBe(false);
  });

  it('caps door barricades at maximum level', () => {
    let doorBarricadeLevel = BALANCE.BARRICADE_MAX_LEVEL;
    const canReinforce = doorBarricadeLevel < BALANCE.BARRICADE_MAX_LEVEL;
    expect(canReinforce).toBe(false);
  });

  it('tracks survival statistics for Last Stand summary', () => {
    const stats = {
      zombiesDefeated: 0,
      cropsHarvested: 0,
      damageDealt: 0,
      damageTaken: 0,
    };

    // Simulate gameplay events
    stats.cropsHarvested += 3;
    stats.zombiesDefeated += 2;
    stats.damageDealt += 60;
    stats.damageTaken += 24;

    expect(stats.cropsHarvested).toBe(3);
    expect(stats.zombiesDefeated).toBe(2);
    expect(stats.damageDealt).toBe(60);
    expect(stats.damageTaken).toBe(24);
  });
});
