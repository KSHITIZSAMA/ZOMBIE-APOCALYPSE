/**
 * Inventory — Container for items with stack limits and slot capacity.
 */

import { BALANCE } from '../data/balance.js';
import { getItem } from '../data/items.js';

export class Inventory {
  /**
   * @param {number} [capacity] - Max slots (default from BALANCE).
   */
  constructor(capacity = BALANCE.INVENTORY_CAPACITY) {
    this.capacity = capacity;
    /** @type {Array<{id: string, count: number}>} */
    this.slots = [];
  }

  /**
   * Add item(s) to inventory.
   * Stacks with existing items if item is stackable, otherwise fills an empty slot.
   * @param {string} itemId
   * @param {number} count
   * @returns {{ success: boolean, added: number, remaining: number }}
   */
  addItem(itemId, count = 1) {
    const itemDef = getItem(itemId);
    if (!itemDef || count <= 0) {
      return { success: false, added: 0, remaining: count };
    }

    const stackMax = itemDef.stackMax || 1;
    let remaining = count;

    // 1. Try to add to existing partial stacks
    for (const slot of this.slots) {
      if (slot.id === itemDef.id && slot.count < stackMax) {
        const canTake = stackMax - slot.count;
        const addAmount = Math.min(canTake, remaining);
        slot.count += addAmount;
        remaining -= addAmount;
        if (remaining <= 0) break;
      }
    }

    // 2. Add into new slots if space permits
    while (remaining > 0 && this.slots.length < this.capacity) {
      const addAmount = Math.min(stackMax, remaining);
      this.slots.push({
        id: itemDef.id,
        count: addAmount,
      });
      remaining -= addAmount;
    }

    const added = count - remaining;
    return {
      success: added > 0,
      added,
      remaining,
    };
  }

  /**
   * Remove item(s) from inventory.
   * @param {string} itemId
   * @param {number} count
   * @returns {boolean} Whether the full requested count was removed
   */
  removeItem(itemId, count = 1) {
    if (this.getItemCount(itemId) < count) return false;

    let remaining = count;
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.id === itemId.toLowerCase()) {
        if (slot.count <= remaining) {
          remaining -= slot.count;
          this.slots.splice(i, 1);
        } else {
          slot.count -= remaining;
          remaining = 0;
        }
        if (remaining <= 0) break;
      }
    }

    return true;
  }

  /**
   * Check if inventory contains at least specified count of an item.
   * @param {string} itemId
   * @param {number} count
   * @returns {boolean}
   */
  hasItem(itemId, count = 1) {
    return this.getItemCount(itemId) >= count;
  }

  /**
   * Total count of an item across all slots.
   * @param {string} itemId
   * @returns {number}
   */
  getItemCount(itemId) {
    const id = itemId.toLowerCase();
    return this.slots
      .filter((s) => s.id === id)
      .reduce((sum, s) => sum + s.count, 0);
  }

  /**
   * Check if inventory has space for an item.
   * @param {string} itemId
   * @param {number} count
   * @returns {boolean}
   */
  canAccept(itemId, count = 1) {
    const itemDef = getItem(itemId);
    if (!itemDef) return false;

    const stackMax = itemDef.stackMax || 1;
    let neededCount = count;

    for (const slot of this.slots) {
      if (slot.id === itemDef.id) {
        neededCount -= Math.max(0, stackMax - slot.count);
        if (neededCount <= 0) return true;
      }
    }

    const emptySlots = this.capacity - this.slots.length;
    return emptySlots * stackMax >= neededCount;
  }

  /**
   * Get all occupied slots with item details.
   * @returns {Array<{id: string, count: number, item: object}>}
   */
  getDetailedSlots() {
    return this.slots.map((slot) => ({
      ...slot,
      item: getItem(slot.id),
    }));
  }

  /**
   * Serialize for save data.
   * @returns {Array<{id: string, count: number}>}
   */
  serialize() {
    return this.slots.map((s) => ({ id: s.id, count: s.count }));
  }

  /**
   * Restore saved inventory.
   * @param {Array<{id: string, count: number}>} data
   */
  deserialize(data) {
    if (Array.isArray(data)) {
      this.slots = data.map((s) => ({ id: s.id, count: s.count }));
    }
  }
}
