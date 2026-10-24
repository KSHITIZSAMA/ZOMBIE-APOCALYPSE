import { describe, it, expect } from 'vitest';
import { getAllOccupations, getOccupation } from '../src/data/occupations.js';

describe('Occupations', () => {
  it('retrieves all predefined occupations', () => {
    const list = getAllOccupations();
    expect(list.length).toBeGreaterThanOrEqual(6);
  });

  it('implements Farmer with agricultural skills and perks', () => {
    const farmer = getOccupation('farmer');
    expect(farmer).toBeDefined();
    expect(farmer.available).toBe(true);
    expect(farmer.skills.farming).toBeGreaterThanOrEqual(20);
    expect(farmer.startingMoney).toBe(400);
    expect(farmer.perks.length).toBeGreaterThan(0);
  });

  it('implements Electrician with electrical skills and perks', () => {
    const electrician = getOccupation('electrician');
    expect(electrician).toBeDefined();
    expect(electrician.available).toBe(true);
    expect(electrician.skills.electrical).toBeGreaterThanOrEqual(30);
    expect(electrician.startingMoney).toBe(650);
  });

  it('implements Writer with research skills and perks', () => {
    const writer = getOccupation('writer');
    expect(writer).toBeDefined();
    expect(writer.available).toBe(true);
    expect(writer.skills.scavenging).toBeGreaterThanOrEqual(10);
    expect(writer.startingMoney).toBe(500);
  });

  it('marks Mechanic, Carpenter, and Doctor as coming soon', () => {
    const mechanic = getOccupation('mechanic');
    const carpenter = getOccupation('carpenter');
    const doctor = getOccupation('doctor');

    expect(mechanic.available).toBe(false);
    expect(mechanic.comingSoon).toBe(true);

    expect(carpenter.available).toBe(false);
    expect(carpenter.comingSoon).toBe(true);

    expect(doctor.available).toBe(false);
    expect(doctor.comingSoon).toBe(true);
  });
});
