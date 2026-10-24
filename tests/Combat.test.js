import { describe, it, expect } from 'vitest';
import { Player } from '../src/entities/Player.js';
import { Zombie } from '../src/entities/Zombie.js';
import { Inventory } from '../src/core/Inventory.js';
import { BALANCE } from '../src/data/balance.js';

describe('Melee Combat System', () => {
  it('triggers player attack swing and initiates cooldown', () => {
    const player = new Player();
    expect(player.isAttacking).toBe(false);

    const success = player.attack();
    expect(success).toBe(true);
    expect(player.isAttacking).toBe(true);
    expect(player.attackCooldownTimer).toBe(BALANCE.PLAYER_ATTACK_COOLDOWN);
    expect(player.getAttackProgress()).toBeGreaterThanOrEqual(0);
  });

  it('blocks spamming attack until cooldown has elapsed', () => {
    const player = new Player();
    player.attack();

    // Immediate second attack attempt fails
    const second = player.attack();
    expect(second).toBe(false);

    // After cooldown expires
    player.update(null, BALANCE.PLAYER_ATTACK_COOLDOWN + 0.05);
    expect(player.attackCooldownTimer).toBe(0);
    const third = player.attack();
    expect(third).toBe(true);
  });

  it('detects melee hits within reach and in facing direction', () => {
    const player = new Player();
    player.x = 500;
    player.facing = 1; // Facing right

    const zombieInFront = new Zombie(530, BALANCE.GROUND_Y); // 30px ahead
    const zombieBehind = new Zombie(470, BALANCE.GROUND_Y);  // 30px behind

    player.attack();

    // Check hit on zombie in front
    const distFront = Math.abs(zombieInFront.x - player.x);
    const inFrontFacing = player.facing === 1 ? zombieInFront.x >= player.x - 10 : zombieInFront.x <= player.x + 10;
    expect(distFront <= player.attackReach && inFrontFacing).toBe(true);

    const hitRes = zombieInFront.takeDamage(player.attackDamage, player.facing);
    expect(hitRes.health).toBe(BALANCE.ZOMBIE_HEALTH - player.attackDamage);

    // Zombie behind is not in front facing
    const inBehindFacing = player.facing === 1 ? zombieBehind.x >= player.x - 10 : zombieBehind.x <= player.x + 10;
    expect(inBehindFacing).toBe(false);
  });

  it('applies timber plank bonus damage when carrying timber in pack', () => {
    const inventory = new Inventory(10);
    inventory.addItem('wood', 1);

    const player = new Player();
    const baseDamage = player.attackDamage;
    const bonusDmg = inventory.hasItem('wood', 1) ? 5 : 0;
    const totalDmg = baseDamage + bonusDmg;

    expect(totalDmg).toBe(baseDamage + 5);

    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    const res = zombie.takeDamage(totalDmg, 1);
    expect(res.health).toBe(BALANCE.ZOMBIE_HEALTH - 20);
  });

  it('zombie attacks reduce survivor health and cause knockback', () => {
    const zombie = new Zombie(500, BALANCE.GROUND_Y);
    const player = new Player();
    player.x = 525;

    let survivorHealth = 100;
    const attackRes = zombie.update(0.1, player.x, player.y, 3000, false);

    expect(attackRes?.attacked).toBe(true);
    survivorHealth -= attackRes.damage;
    player.x += zombie.facing * 18;

    expect(survivorHealth).toBe(100 - BALANCE.ZOMBIE_DAMAGE);
    expect(player.x).toBeGreaterThan(525);
  });
});
