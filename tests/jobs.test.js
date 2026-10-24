import { describe, it, expect } from 'vitest';
import { getAllJobs, getJob } from '../src/data/jobs.js';
import { Player } from '../src/entities/Player.js';

describe('Jobs System', () => {
  it('retrieves all defined jobs', () => {
    const jobs = getAllJobs();
    expect(jobs.length).toBeGreaterThanOrEqual(3);
  });

  it('implements Agricultural Field Labor with Farmer bonus', () => {
    const job = getJob('farm_hand');
    expect(job).toBeDefined();
    expect(job.durationHours).toBe(4);
    expect(job.fatigueCost).toBeGreaterThan(0);

    const normal = new Player();
    normal.occupation = 'writer';
    expect(job.getReward(normal)).toBe(60);

    const farmer = new Player();
    farmer.occupation = 'farmer';
    expect(job.getReward(farmer)).toBeGreaterThan(60); // Farmer bonus
  });

  it('implements Electrical Maintenance requiring Electrician occupation', () => {
    const job = getJob('electrical_repair');
    expect(job).toBeDefined();
    expect(job.requiredOccupation).toBe('electrician');
    expect(job.getReward()).toBe(110);
  });

  it('implements Investigative Column requiring Writer occupation', () => {
    const job = getJob('freelance_article');
    expect(job).toBeDefined();
    expect(job.requiredOccupation).toBe('writer');
    expect(job.getReward()).toBe(85);
  });
});
