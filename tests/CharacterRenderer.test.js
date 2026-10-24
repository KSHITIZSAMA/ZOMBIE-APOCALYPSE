import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterRenderer } from '../src/render/CharacterRenderer.js';

describe('CharacterRenderer', () => {
  let renderer;
  let mockCtx;

  beforeEach(() => {
    renderer = new CharacterRenderer();
    mockCtx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      quadraticCurveTo: () => {},
    };
  });

  it('renders all hair styles without crashing', () => {
    const hairStyles = ['messy', 'short', 'ponytail', 'bald'];
    const baseAppearance = {
      skinColor: '#E6CBA8',
      hairColor: '#4A3728',
      shirtColor: '#5a7090',
      pantsColor: '#3a4555',
      shoeColor: '#3a3530',
      clothingStyle: 'casual',
    };

    for (const style of hairStyles) {
      expect(() => {
        renderer.draw(mockCtx, 100, 200, { ...baseAppearance, hairStyle: style });
      }).not.toThrow();
    }
  });

  it('renders all clothing styles with high-detail accessories', () => {
    const clothingStyles = ['casual', 'workwear', 'jacket'];
    const baseAppearance = {
      skinColor: '#E6CBA8',
      hairColor: '#4A3728',
      hairStyle: 'messy',
      shirtColor: '#5a7090',
      pantsColor: '#3a4555',
      shoeColor: '#3a3530',
    };

    for (const style of clothingStyles) {
      expect(() => {
        renderer.draw(mockCtx, 100, 200, { ...baseAppearance, clothingStyle: style });
      }).not.toThrow();
    }
  });

  it('renders attack swing animation and spiked club weapon', () => {
    const appearance = {
      skinColor: '#E6CBA8',
      hairColor: '#4A3728',
      hairStyle: 'short',
      shirtColor: '#5a7090',
      pantsColor: '#3a4555',
      shoeColor: '#3a3530',
      clothingStyle: 'jacket',
    };

    expect(() => {
      renderer.draw(mockCtx, 100, 200, appearance, 1, 0.5, true, true, 0.6);
    }).not.toThrow();
  });

  it('calculates skeleton joints with dynamic walking bob and lean', () => {
    const jointsIdle = renderer._calculateJoints(0, false);
    const jointsWalking = renderer._calculateJoints(0.25, true);

    expect(jointsIdle.bodyBob).toBe(0);
    expect(jointsWalking.bodyBob).toBeGreaterThan(0);
    expect(jointsWalking.head.y).toBeDefined();
    expect(jointsWalking.shoulder.x).toBeDefined();
    expect(jointsWalking.hip.x).toBeDefined();
    expect(jointsWalking.leftFoot.x).toBeDefined();
    expect(jointsWalking.rightFoot.x).toBeDefined();
  });
});
