/**
 * Zombie — Shambling walker entity with AI state machine, detection,
 * attack cooldowns, knockback, and damage handling.
 */

import { BALANCE } from '../data/balance.js';

export class Zombie {
  /**
   * @param {number} x - Initial world X position.
   * @param {number} y - Initial world Y position.
   * @param {string} [id] - Unique identifier.
   * @param {'walker'|'runner'} [type] - Undead variant.
   */
  constructor(x, y = BALANCE.GROUND_Y, id = null, type = 'walker') {
    this.id = id || `zombie_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.facing = 1;

    // Variant Stats
    if (this.type === 'runner') {
      this.health = 20;
      this.maxHealth = 20;
      this.speed = 82;
      this.damage = 8;
      this.attackRange = BALANCE.ZOMBIE_ATTACK_RANGE;
      this.attackCooldown = 0.8;
      this.walkCycleDuration = 0.45; // Fast sprint cycle
    } else {
      this.health = BALANCE.ZOMBIE_HEALTH;
      this.maxHealth = BALANCE.ZOMBIE_HEALTH;
      this.speed = BALANCE.ZOMBIE_SPEED;
      this.damage = BALANCE.ZOMBIE_DAMAGE;
      this.attackRange = BALANCE.ZOMBIE_ATTACK_RANGE;
      this.attackCooldown = BALANCE.ZOMBIE_ATTACK_COOLDOWN;
      this.walkCycleDuration = 0.9;
    }
    this.agroRange = BALANCE.ZOMBIE_AGRO_RANGE;

    // AI & Combat States: 'patrol' | 'chase' | 'attack' | 'stunned' | 'dead'
    this.state = 'patrol';
    this.isDead = false;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackCooldownTimer = 0;
    this.stunTimer = 0;

    // Animation & Patrol
    this.walkTime = 0;
    this.patrolOriginX = x;
    this.patrolTargetX = x + (Math.random() > 0.5 ? 80 : -80);
    this.patrolWait = 0;
  }

  /**
   * Update zombie AI, movement, and combat logic.
   * @param {number} dt - Delta time in seconds.
   * @param {number} playerX - World X coordinate of player.
   * @param {number} playerY - World Y coordinate of player.
   * @param {number} [customWorldWidth] - Boundary limit.
   * @param {boolean} [isInterior] - Whether player is inside the farmhouse.
   * @returns {{ attacked: boolean, damage: number, zombie: Zombie } | null}
   */
  update(dt, playerX, playerY, customWorldWidth = BALANCE.WORLD_WIDTH, isInterior = false) {
    if (this.isDead) return null;

    // Advance combat timers
    this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    if (this.attackTimer <= 0) {
      this.isAttacking = false;
    }

    // Stunned reaction
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      this.state = 'stunned';
      return null;
    }

    const dx = playerX - this.x;
    const absDist = Math.abs(dx);

    // If player is inside the farmhouse, zombie cannot sense them directly; wanders exterior
    if (isInterior) {
      this._updatePatrol(dt, customWorldWidth);
      return null;
    }

    // Agro Detection
    if (absDist <= this.agroRange) {
      this.facing = dx >= 0 ? 1 : -1;

      // In Melee Attack Range
      if (absDist <= this.attackRange) {
        this.vx = 0;
        this.state = 'attack';

        if (this.attackCooldownTimer <= 0) {
          this.isAttacking = true;
          this.attackTimer = 0.35;
          this.attackCooldownTimer = this.attackCooldown;
          return {
            attacked: true,
            damage: this.damage,
            zombie: this,
          };
        }
      } else {
        // Chase Survivor
        this.state = 'chase';
        this.vx = this.facing * this.speed;
        this.x += this.vx * dt;
        this.walkTime += dt;
      }
    } else {
      // Normal Patrol wandering
      this._updatePatrol(dt, customWorldWidth);
    }

    // Boundary clamp
    const margin = 30;
    this.x = Math.max(margin, Math.min(this.x, customWorldWidth - margin));

    return null;
  }

  /**
   * Handle passive wandering when no survivor is nearby.
   * @private
   */
  _updatePatrol(dt, customWorldWidth) {
    this.state = 'patrol';

    if (this.patrolWait > 0) {
      this.patrolWait -= dt;
      this.vx = 0;
      return;
    }

    const distToTarget = this.patrolTargetX - this.x;
    if (Math.abs(distToTarget) < 10) {
      // Reached destination, wait a moment and pick new target
      this.patrolWait = 1.5 + Math.random() * 2;
      const offset = (Math.random() - 0.5) * 200;
      this.patrolTargetX = Math.max(50, Math.min(customWorldWidth - 50, this.patrolOriginX + offset));
      this.vx = 0;
    } else {
      this.facing = distToTarget >= 0 ? 1 : -1;
      this.vx = this.facing * (this.speed * 0.5); // Shambles at half-speed while idle
      this.x += this.vx * dt;
      this.walkTime += dt;
    }
  }

  /**
   * Take damage from survivor melee attack.
   * @param {number} amount
   * @param {number} [knockbackDir] - 1 (right) or -1 (left)
   * @returns {{ dead: boolean, health: number, damage: number }}
   */
  takeDamage(amount, knockbackDir = 0) {
    this.health = Math.max(0, this.health - amount);
    this.stunTimer = 0.25;

    // Apply knockback
    if (knockbackDir !== 0) {
      this.x += knockbackDir * 18;
    }

    if (this.health <= 0) {
      this.isDead = true;
      this.state = 'dead';
    }

    return {
      dead: this.isDead,
      health: this.health,
      damage: amount,
    };
  }

  /**
   * Get walk animation cycle phase [0, 1].
   * @returns {number}
   */
  getWalkPhase() {
    if (this.state !== 'chase' && (this.state !== 'patrol' || this.vx === 0)) {
      return 0;
    }
    return (this.walkTime % this.walkCycleDuration) / this.walkCycleDuration;
  }
}
