import { describe, it, expect } from 'vitest';
import { Player } from '../src/entities/Player.js';
import { BALANCE } from '../src/data/balance.js';

describe('Player', () => {
  it('initializes at world center on ground line', () => {
    const player = new Player();
    expect(player.x).toBe(BALANCE.WORLD_WIDTH / 2);
    expect(player.y).toBe(BALANCE.GROUND_Y);
    expect(player.facing).toBe(1);
    expect(player.isWalking).toBe(false);
  });

  it('moves right when right input is active', () => {
    const player = new Player();
    const startX = player.x;
    const mockInput = {
      isMovingLeft: () => false,
      isMovingRight: () => true,
    };

    player.update(mockInput, 0.1);
    expect(player.x).toBeGreaterThan(startX);
    expect(player.facing).toBe(1);
    expect(player.isWalking).toBe(true);
    expect(player.getWalkPhase()).toBeGreaterThan(0);
  });

  it('moves left when left input is active', () => {
    const player = new Player();
    const startX = player.x;
    const mockInput = {
      isMovingLeft: () => true,
      isMovingRight: () => false,
    };

    player.update(mockInput, 0.1);
    expect(player.x).toBeLessThan(startX);
    expect(player.facing).toBe(-1);
    expect(player.isWalking).toBe(true);
  });

  it('does not move when both directions are pressed', () => {
    const player = new Player();
    const startX = player.x;
    const mockInput = {
      isMovingLeft: () => true,
      isMovingRight: () => true,
    };

    player.update(mockInput, 0.1);
    expect(player.x).toBe(startX);
    expect(player.isWalking).toBe(false);
  });

  it('clamps movement within world bounds', () => {
    const player = new Player();
    player.x = 10;
    const mockInput = {
      isMovingLeft: () => true,
      isMovingRight: () => false,
    };

    player.update(mockInput, 1.0);
    expect(player.x).toBeGreaterThanOrEqual(30);

    player.x = BALANCE.WORLD_WIDTH - 10;
    mockInput.isMovingLeft = () => false;
    mockInput.isMovingRight = () => true;

    player.update(mockInput, 1.0);
    expect(player.x).toBeLessThanOrEqual(BALANCE.WORLD_WIDTH - 30);
  });

  it('serializes and deserializes correctly', () => {
    const player = new Player();
    player.x = 550;
    player.facing = -1;
    player.name = 'Hero';

    const saved = player.serialize();
    const newPlayer = new Player();
    newPlayer.deserialize(saved);

    expect(newPlayer.x).toBe(550);
    expect(newPlayer.facing).toBe(-1);
    expect(newPlayer.name).toBe('Hero');
  });
});
