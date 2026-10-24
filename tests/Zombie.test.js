import { describe, it, expect } from 'vitest';
import { Zombie } from '../src/entities/Zombie.js';
import { BALANCE } from '../src/data/balance.js';

describe('Zombie AI & Entity', () => {
  it('initializes with balanced walker stats', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    expect(zombie.health).toBe(BALANCE.ZOMBIE_HEALTH);
    expect(zombie.maxHealth).toBe(BALANCE.ZOMBIE_HEALTH);
    expect(zombie.speed).toBe(BALANCE.ZOMBIE_SPEED);
    expect(zombie.damage).toBe(BALANCE.ZOMBIE_DAMAGE);
    expect(zombie.isDead).toBe(false);
    expect(zombie.state).toBe('patrol');
  });

  it('wanders passively in patrol when player is outside detection radius', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    const playerX = 1500; // Far away (1000px)

    zombie.update(0.1, playerX, BALANCE.GROUND_Y, 3000, false);
    expect(zombie.state).toBe('patrol');
    expect(zombie.isAttacking).toBe(false);
  });

  it('triggers chase behavior when player enters agro range', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    const playerX = 650; // Within 150px (less than agroRange 320)

    zombie.update(0.1, playerX, BALANCE.GROUND_Y, 3000, false);
    expect(zombie.state).toBe('chase');
    expect(zombie.facing).toBe(1); // Moving right towards player
    expect(zombie.vx).toBeGreaterThan(0);
    expect(zombie.x).toBeGreaterThan(500);
  });

  it('executes melee attack when player is within attack range', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    const playerX = 525; // 25px away (within attackRange 35)

    const attackRes = zombie.update(0.1, playerX, BALANCE.GROUND_Y, 3000, false);
    expect(attackRes).not.toBeNull();
    expect(attackRes.attacked).toBe(true);
    expect(attackRes.damage).toBe(BALANCE.ZOMBIE_DAMAGE);
    expect(zombie.isAttacking).toBe(true);
    expect(zombie.attackCooldownTimer).toBeGreaterThan(0);
  });

  it('enforces attack cooldown and does not attack again immediately', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    const playerX = 525;

    // First attack
    const first = zombie.update(0.1, playerX, BALANCE.GROUND_Y, 3000, false);
    expect(first?.attacked).toBe(true);

    // Immediate next frame
    const second = zombie.update(0.016, playerX, BALANCE.GROUND_Y, 3000, false);
    expect(second).toBeNull();
  });

  it('takes damage, applies knockback, and enters stun state', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    const initialX = zombie.x;

    const res = zombie.takeDamage(15, 1); // Knockback to right
    expect(res.dead).toBe(false);
    expect(zombie.health).toBe(15);
    expect(zombie.stunTimer).toBeGreaterThan(0);
    expect(zombie.x).toBeGreaterThan(initialX);

    // While stunned, does not chase
    zombie.update(0.05, 520, BALANCE.GROUND_Y, 3000, false);
    expect(zombie.state).toBe('stunned');
  });

  it('dies when health reaches 0 or below', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);

    const res = zombie.takeDamage(35, -1);
    expect(res.dead).toBe(true);
    expect(zombie.isDead).toBe(true);
    expect(zombie.health).toBe(0);
    expect(zombie.state).toBe('dead');

    // Dead zombie returns null on update
    const updateRes = zombie.update(0.1, 500, BALANCE.GROUND_Y, 3000, false);
    expect(updateRes).toBeNull();
  });

  it('initializes runner variant with faster speed, lower HP, and aggressive attack cooldown', () => {
    const runner = new Zombie(500, BALANCE.GROUND_Y, 'runner_test', 'runner');
    expect(runner.type).toBe('runner');
    expect(runner.health).toBe(20);
    expect(runner.maxHealth).toBe(20);
    expect(runner.speed).toBe(82);
    expect(runner.damage).toBe(8);
    expect(runner.attackCooldown).toBe(0.8);
    expect(runner.speed).toBeGreaterThan(BALANCE.ZOMBIE_SPEED);
  });

  it('runner closes distance faster than standard walker', () => {
    const walker = new Zombie(500, BALANCE.GROUND_Y, 'w1', 'walker');
    const runner = new Zombie(500, BALANCE.GROUND_Y, 'r1', 'runner');
    const playerX = 700;

    walker.update(0.5, playerX, BALANCE.GROUND_Y, 3000, false);
    runner.update(0.5, playerX, BALANCE.GROUND_Y, 3000, false);

    expect(runner.x).toBeGreaterThan(walker.x);
  });
});

