/**
 * FarmingSystem — Functional ranch agriculture.
 * Manages soil preparation, seed planting, watering, growth time, and harvesting.
 */

import { getItem } from '../data/items.js';

/** @enum {string} Soil plot state */
export const PlotState = {
  UNTILLED: 'untilled',
  TILLED: 'tilled',
  GROWING: 'growing',
  MATURE: 'mature',
};

export class FarmingSystem {
  constructor() {
    /** @type {Array<object>} Ranch garden plots */
    this.plots = [
      {
        state: PlotState.TILLED,
        cropId: null,
        cropName: null,
        growthHours: 0,
        requiredHours: 24,
        isWatered: false,
        yieldCount: 2,
      },
    ];
  }

  /**
   * Get primary ranch plot.
   * @param {number} [index]
   * @returns {object}
   */
  getPlot(index = 0) {
    return this.plots[index] || null;
  }

  /**
   * Till the plot to make it ready for planting.
   * @param {number} [index]
   * @returns {{ success: boolean, message: string }}
   */
  tillPlot(index = 0) {
    const plot = this.getPlot(index);
    if (!plot) return { success: false, message: 'Invalid plot.' };

    if (plot.state === PlotState.UNTILLED) {
      plot.state = PlotState.TILLED;
      return { success: true, message: 'Soil tilled and prepared for planting.' };
    }
    return { success: false, message: 'Soil is already prepared.' };
  }

  /**
   * Plant seeds into prepared soil.
   * @param {string} seedItemId - Item ID of seed
   * @param {import('./Inventory.js').Inventory} inventory
   * @param {import('../entities/Player.js').Player} player
   * @param {number} [index]
   * @returns {{ success: boolean, message: string }}
   */
  plantSeed(seedItemId, inventory, player, index = 0) {
    const plot = this.getPlot(index);
    if (!plot) return { success: false, message: 'Invalid plot.' };

    if (plot.state !== PlotState.TILLED) {
      return { success: false, message: 'Soil must be tilled before planting seeds.' };
    }

    const item = getItem(seedItemId);
    if (!item?.cropData) {
      return { success: false, message: 'This item cannot be planted as a crop.' };
    }

    if (!inventory.hasItem(seedItemId, 1)) {
      return { success: false, message: `You need ${item.name} to plant.` };
    }

    inventory.removeItem(seedItemId, 1);

    // Calculate crop parameters with Farmer & Green Thumb bonuses
    let growthTime = item.cropData.growthHours;
    let yieldAmount = item.cropData.harvestYield;

    if (player?.occupation === 'farmer') {
      growthTime = Math.round(growthTime * 0.8); // 20% faster
      yieldAmount += 1;
    }
    if (player?.traits?.includes('green_thumb')) {
      growthTime = Math.round(growthTime * 0.85); // Additional 15% faster
      yieldAmount += 1;
    }

    plot.state = PlotState.GROWING;
    plot.cropId = item.cropData.cropId;
    plot.cropName = item.cropData.cropName;
    plot.growthHours = 0;
    plot.requiredHours = growthTime;
    plot.isWatered = false;
    plot.yieldCount = yieldAmount;

    return {
      success: true,
      message: `Planted ${item.cropData.cropName}. Will mature in ~${growthTime} hours.`,
    };
  }

  /**
   * Water the growing crop to accelerate growth.
   * @param {number} [index]
   * @returns {{ success: boolean, message: string }}
   */
  waterPlot(index = 0) {
    const plot = this.getPlot(index);
    if (!plot) return { success: false, message: 'Invalid plot.' };

    if (plot.state !== PlotState.GROWING) {
      return { success: false, message: 'Only planted crops need watering.' };
    }

    if (plot.isWatered) {
      return { success: false, message: 'Soil is already adequately moist.' };
    }

    plot.isWatered = true;
    return { success: true, message: 'Watered the crop. Growth rate increased!' };
  }

  /**
   * Advance crop growth as game time progresses.
   * @param {number} hours
   */
  advanceHours(hours) {
    if (hours <= 0) return;

    for (const plot of this.plots) {
      if (plot.state === PlotState.GROWING) {
        // Watered crops grow at 1.3x speed, unwatered at 0.7x speed
        const speed = plot.isWatered ? 1.3 : 0.7;
        plot.growthHours += hours * speed;

        if (plot.growthHours >= plot.requiredHours) {
          plot.state = PlotState.MATURE;
          plot.growthHours = plot.requiredHours;
        }
      }
    }
  }

  /**
   * Harvest mature crop.
   * @param {import('./Inventory.js').Inventory} inventory
   * @param {number} [index]
   * @returns {{ success: boolean, harvestedCount: number, message: string }}
   */
  harvest(inventory, index = 0) {
    const plot = this.getPlot(index);
    if (!plot) return { success: false, harvestedCount: 0, message: 'Invalid plot.' };

    if (plot.state !== PlotState.MATURE) {
      return { success: false, harvestedCount: 0, message: 'Crop is not mature yet.' };
    }

    if (!inventory.canAccept(plot.cropId, plot.yieldCount)) {
      return { success: false, harvestedCount: 0, message: 'Inventory is full! Free up space first.' };
    }

    const cropId = plot.cropId;
    const cropName = plot.cropName;
    const count = plot.yieldCount;

    inventory.addItem(cropId, count);

    // Reset plot back to tilled
    plot.state = PlotState.TILLED;
    plot.cropId = null;
    plot.cropName = null;
    plot.growthHours = 0;
    plot.isWatered = false;

    return {
      success: true,
      harvestedCount: count,
      message: `Harvested ${count}x fresh ${cropName}!`,
    };
  }

  /**
   * Serialize for save data.
   * @returns {Array<object>}
   */
  serialize() {
    return this.plots.map((p) => ({ ...p }));
  }

  /**
   * Restore saved farming state.
   * @param {Array<object>} data
   */
  deserialize(data) {
    if (Array.isArray(data)) {
      this.plots = data.map((p) => ({ ...p }));
    }
  }
}
