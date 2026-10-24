import { describe, it, expect } from 'vitest';
import { Inventory } from '../src/core/Inventory.js';

describe('Inventory', () => {
  it('adds items and stacks stackable items within max capacity', () => {
    const inv = new Inventory(5);
    const res1 = inv.addItem('corn_seed', 5);
    expect(res1.success).toBe(true);
    expect(res1.added).toBe(5);
    expect(inv.slots.length).toBe(1);

    // Add more of the same stackable item
    const res2 = inv.addItem('corn_seed', 3);
    expect(res2.added).toBe(3);
    expect(inv.slots.length).toBe(1);
    expect(inv.getItemCount('corn_seed')).toBe(8);
  });

  it('respects inventory slot capacity limits', () => {
    const inv = new Inventory(2);
    inv.addItem('hand_trowel', 1); // 1 non-stackable tool
    inv.addItem('wood', 5);        // 1 slot of wood

    expect(inv.slots.length).toBe(2);
    expect(inv.canAccept('bread', 1)).toBe(false);

    const res = inv.addItem('bread', 1);
    expect(res.added).toBe(0);
    expect(res.remaining).toBe(1);
  });

  it('removes items and cleans up empty slots', () => {
    const inv = new Inventory(10);
    inv.addItem('water_bottle', 3);

    expect(inv.hasItem('water_bottle', 2)).toBe(true);

    const removed = inv.removeItem('water_bottle', 2);
    expect(removed).toBe(true);
    expect(inv.getItemCount('water_bottle')).toBe(1);

    inv.removeItem('water_bottle', 1);
    expect(inv.getItemCount('water_bottle')).toBe(0);
    expect(inv.slots.length).toBe(0);
  });

  it('serializes and deserializes properly', () => {
    const inv = new Inventory(10);
    inv.addItem('bread', 2);
    inv.addItem('wood', 10);

    const data = inv.serialize();
    const newInv = new Inventory(10);
    newInv.deserialize(data);

    expect(newInv.getItemCount('bread')).toBe(2);
    expect(newInv.getItemCount('wood')).toBe(10);
    expect(newInv.slots.length).toBe(2);
  });
});
