import { describe, it, expect } from 'vitest';
import { FarmingSystem, PlotState } from '../src/core/FarmingSystem.js';
import { Inventory } from '../src/core/Inventory.js';
import { Player } from '../src/entities/Player.js';

describe('FarmingSystem', () => {
  it('starts with a tilled plot ready for sowing', () => {
    const farm = new FarmingSystem();
    const plot = farm.getPlot(0);
    expect(plot).toBeDefined();
    expect(plot.state).toBe(PlotState.TILLED);
  });

  it('plants seeds into tilled soil, deducting seeds from inventory', () => {
    const farm = new FarmingSystem();
    const inv = new Inventory(10);
    inv.addItem('corn_seed', 2);
    const player = new Player();

    const res = farm.plantSeed('corn_seed', inv, player, 0);
    expect(res.success).toBe(true);

    const plot = farm.getPlot(0);
    expect(plot.state).toBe(PlotState.GROWING);
    expect(plot.cropId).toBe('corn');
    expect(inv.getItemCount('corn_seed')).toBe(1);
  });

  it('accelerates growth rate when watered', () => {
    const farm = new FarmingSystem();
    const inv = new Inventory(10);
    inv.addItem('tomato_seed', 1);
    const player = new Player();

    farm.plantSeed('tomato_seed', inv, player, 0);
    farm.waterPlot(0);

    const plot = farm.getPlot(0);
    expect(plot.isWatered).toBe(true);

    farm.advanceHours(5);
    // Watered rate is 1.3x -> 5 * 1.3 = 6.5 hours
    expect(plot.growthHours).toBeCloseTo(6.5, 1);
  });

  it('matures after required hours and harvests into inventory', () => {
    const farm = new FarmingSystem();
    const inv = new Inventory(10);
    inv.addItem('tomato_seed', 1);
    const player = new Player();

    farm.plantSeed('tomato_seed', inv, player, 0);
    farm.waterPlot(0);
    const plot = farm.getPlot(0);

    // Advance beyond required hours (watered speed is 1.3x)
    farm.advanceHours(plot.requiredHours);
    expect(plot.state).toBe(PlotState.MATURE);

    // Harvest
    const harvestRes = farm.harvest(inv, 0);
    expect(harvestRes.success).toBe(true);
    expect(harvestRes.harvestedCount).toBeGreaterThan(0);
    expect(inv.getItemCount('tomato')).toBe(harvestRes.harvestedCount);

    // Plot resets back to tilled
    expect(farm.getPlot(0).state).toBe(PlotState.TILLED);
  });

  it('grants growth speed and yield perks to Farmer occupation', () => {
    const farm = new FarmingSystem();
    const inv = new Inventory(10);
    inv.addItem('corn_seed', 2);

    const normalPlayer = new Player();
    normalPlayer.occupation = 'writer';

    const farmerPlayer = new Player();
    farmerPlayer.occupation = 'farmer';

    farm.plantSeed('corn_seed', inv, normalPlayer, 0);
    const normalReqHours = farm.getPlot(0).requiredHours;
    const normalYield = farm.getPlot(0).yieldCount;

    // Reset plot for farmer
    farm.getPlot(0).state = PlotState.TILLED;
    farm.plantSeed('corn_seed', inv, farmerPlayer, 0);
    const farmerReqHours = farm.getPlot(0).requiredHours;
    const farmerYield = farm.getPlot(0).yieldCount;

    expect(farmerReqHours).toBeLessThan(normalReqHours);
    expect(farmerYield).toBeGreaterThan(normalYield);
  });
});
