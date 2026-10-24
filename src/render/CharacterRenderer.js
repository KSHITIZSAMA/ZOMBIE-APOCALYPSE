/**
 * CharacterRenderer — Draws jointed stickman characters with hand-drawn style.
 * Uses a skeleton system for walking animation.
 * Character customization visibly affects hair style, clothing style, colors, and proportions.
 */

import { PALETTE } from '../data/balance.js';

/** Stickman body proportions (in pixels from feet) */
const BODY = {
  HEAD_RADIUS: 10,
  NECK_Y: 45,        // neck height from feet
  SHOULDER_Y: 42,
  HIP_Y: 22,
  TORSO_WIDTH: 6,
  ARM_UPPER: 14,
  ARM_LOWER: 13,
  LEG_UPPER: 14,
  LEG_LOWER: 12,
  FOOT_LENGTH: 6,
  EYE_SIZE: 2.5,
  OUTLINE_WIDTH: 2.5,
  TOTAL_HEIGHT: 55,   // Approximate total height
};

export class CharacterRenderer {
  /**
   * Draw a stickman character.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Screen X position (feet center).
   * @param {number} y - Screen Y position (feet on ground).
   * @param {object} appearance - { skinColor, hairColor, hairStyle, shirtColor, pantsColor, shoeColor, clothingStyle }
   * @param {number} facing - 1 = right, -1 = left
   * @param {number} walkPhase - Walk cycle phase [0, 1], 0 = idle
   * @param {boolean} isWalking
   * @param {boolean} [isAttacking]
   * @param {number} [attackProgress] - Swing progress [0, 1]
   */
  draw(ctx, x, y, appearance, facing = 1, walkPhase = 0, isWalking = false, isAttacking = false, attackProgress = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1); // Flip for facing direction

    // Calculate joint positions from walk phase and attack state
    const joints = this._calculateJoints(walkPhase, isWalking, isAttacking, attackProgress);

    // Draw in back-to-front order
    this._drawLegs(ctx, joints, appearance);
    this._drawTorso(ctx, joints, appearance);
    this._drawArms(ctx, joints, appearance, isAttacking, attackProgress);
    this._drawHead(ctx, joints, appearance, facing);

    ctx.restore();
  }

  /**
   * Calculate all joint positions for the current animation frame.
   * @param {number} phase - [0, 1] walk cycle
   * @param {boolean} isWalking
   * @returns {object} Joint positions
   */
  _calculateJoints(phase, isWalking, isAttacking = false, attackProgress = 0) {
    const sin = Math.sin(phase * Math.PI * 2);

    // Walk animation parameters
    const walkSwing = isWalking ? 0.45 : 0;
    const bodyBob = isWalking ? Math.abs(sin) * 2 : 0;
    const bodyLean = isWalking ? sin * 0.03 : 0;

    // Hip position (center of body)
    const hipX = 0;
    const hipY = -(BODY.HIP_Y + bodyBob);

    // Shoulder position
    const shoulderX = hipX + Math.sin(bodyLean) * (BODY.SHOULDER_Y - BODY.HIP_Y);
    const shoulderY = -(BODY.SHOULDER_Y + bodyBob);

    // Head
    const headX = shoulderX;
    const headY = -(BODY.NECK_Y + bodyBob + BODY.HEAD_RADIUS);

    // Leg angles
    const leftLegSwing = sin * walkSwing;
    const rightLegSwing = -sin * walkSwing;

    // Left leg
    const leftKneeX = hipX + Math.sin(leftLegSwing) * BODY.LEG_UPPER;
    const leftKneeY = hipY + Math.cos(leftLegSwing) * BODY.LEG_UPPER;

    const leftKneeAngle = leftLegSwing * 0.5 - (isWalking ? Math.max(0, sin) * 0.4 : 0);
    const leftFootX = leftKneeX + Math.sin(leftKneeAngle) * BODY.LEG_LOWER;
    const leftFootY = leftKneeY + Math.cos(leftKneeAngle) * BODY.LEG_LOWER;

    // Right leg
    const rightKneeX = hipX + Math.sin(rightLegSwing) * BODY.LEG_UPPER;
    const rightKneeY = hipY + Math.cos(rightLegSwing) * BODY.LEG_UPPER;

    const rightKneeAngle = rightLegSwing * 0.5 - (isWalking ? Math.max(0, -sin) * 0.4 : 0);
    const rightFootX = rightKneeX + Math.sin(rightKneeAngle) * BODY.LEG_LOWER;
    const rightFootY = rightKneeY + Math.cos(rightKneeAngle) * BODY.LEG_LOWER;

    let leftElbowX, leftElbowY, leftHandX, leftHandY;
    let rightElbowX, rightElbowY, rightHandX, rightHandY;

    if (isAttacking) {
      // Dynamic forward melee strike swing
      const swingAngle = -1.2 + attackProgress * 2.5; // From cocked back to full swing forward
      rightElbowX = shoulderX + Math.sin(swingAngle) * (BODY.ARM_UPPER * 0.95);
      rightElbowY = shoulderY + Math.cos(swingAngle) * (BODY.ARM_UPPER * 0.95);
      rightHandX = rightElbowX + Math.sin(swingAngle + 0.35) * (BODY.ARM_LOWER * 1.15);
      rightHandY = rightElbowY + Math.cos(swingAngle + 0.35) * (BODY.ARM_LOWER * 1.15);

      // Left arm pulls back for balance
      leftElbowX = shoulderX - 8;
      leftElbowY = shoulderY + 8;
      leftHandX = leftElbowX - 6;
      leftHandY = leftElbowY + 6;
    } else {
      // Normal walk / idle arm swing
      const leftArmSwing = -sin * walkSwing * 0.6;
      const rightArmSwing = sin * walkSwing * 0.6;

      leftElbowX = shoulderX + Math.sin(leftArmSwing) * BODY.ARM_UPPER;
      leftElbowY = shoulderY + Math.cos(leftArmSwing) * BODY.ARM_UPPER;

      const leftArmAngle = leftArmSwing * 0.3 + (isWalking ? 0.2 : 0.1);
      leftHandX = leftElbowX + Math.sin(leftArmAngle) * BODY.ARM_LOWER;
      leftHandY = leftElbowY + Math.cos(leftArmAngle) * BODY.ARM_LOWER;

      rightElbowX = shoulderX + Math.sin(rightArmSwing) * BODY.ARM_UPPER;
      rightElbowY = shoulderY + Math.cos(rightArmSwing) * BODY.ARM_UPPER;

      const rightArmAngle = rightArmSwing * 0.3 + (isWalking ? 0.2 : 0.1);
      rightHandX = rightElbowX + Math.sin(rightArmAngle) * BODY.ARM_LOWER;
      rightHandY = rightElbowY + Math.cos(rightArmAngle) * BODY.ARM_LOWER;
    }

    return {
      head: { x: headX, y: headY },
      shoulder: { x: shoulderX, y: shoulderY },
      hip: { x: hipX, y: hipY },
      leftKnee: { x: leftKneeX, y: leftKneeY },
      leftFoot: { x: leftFootX, y: leftFootY },
      rightKnee: { x: rightKneeX, y: rightKneeY },
      rightFoot: { x: rightFootX, y: rightFootY },
      leftElbow: { x: leftElbowX, y: leftElbowY },
      leftHand: { x: leftHandX, y: leftHandY },
      rightElbow: { x: rightElbowX, y: rightElbowY },
      rightHand: { x: rightHandX, y: rightHandY },
      bodyBob,
      walkPhase: phase,
      isWalking,
    };
  }

  /**
   * Draw legs with ink-style lines.
   */
  _drawLegs(ctx, joints, appearance) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Pants (thigh to knee)
    ctx.strokeStyle = appearance.pantsColor || PALETTE.PANTS_DEFAULT;
    ctx.lineWidth = BODY.OUTLINE_WIDTH + 2.5;

    // Left leg
    ctx.beginPath();
    ctx.moveTo(joints.hip.x - 3, joints.hip.y);
    ctx.lineTo(joints.leftKnee.x, joints.leftKnee.y);
    ctx.lineTo(joints.leftFoot.x, joints.leftFoot.y);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(joints.hip.x + 3, joints.hip.y);
    ctx.lineTo(joints.rightKnee.x, joints.rightKnee.y);
    ctx.lineTo(joints.rightFoot.x, joints.rightFoot.y);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;

    ctx.beginPath();
    ctx.moveTo(joints.hip.x - 3, joints.hip.y);
    ctx.lineTo(joints.leftKnee.x, joints.leftKnee.y);
    ctx.lineTo(joints.leftFoot.x, joints.leftFoot.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(joints.hip.x + 3, joints.hip.y);
    ctx.lineTo(joints.rightKnee.x, joints.rightKnee.y);
    ctx.lineTo(joints.rightFoot.x, joints.rightFoot.y);
    ctx.stroke();

    // Shoes
    ctx.strokeStyle = appearance.shoeColor || PALETTE.SHOE_DEFAULT;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(joints.leftFoot.x, joints.leftFoot.y);
    ctx.lineTo(joints.leftFoot.x + BODY.FOOT_LENGTH, joints.leftFoot.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(joints.rightFoot.x, joints.rightFoot.y);
    ctx.lineTo(joints.rightFoot.x + BODY.FOOT_LENGTH, joints.rightFoot.y);
    ctx.stroke();
  }

  /**
   * Draw torso with customization (casual shirt, workwear overalls, or jacket).
   */
  _drawTorso(ctx, joints, appearance) {
    ctx.lineCap = 'round';
    const style = appearance.clothingStyle || 'casual';

    // Base shirt body fill
    ctx.strokeStyle = appearance.shirtColor || PALETTE.SHIRT_DEFAULT;
    ctx.lineWidth = BODY.TORSO_WIDTH + 3;

    ctx.beginPath();
    ctx.moveTo(joints.hip.x, joints.hip.y);
    ctx.lineTo(joints.shoulder.x, joints.shoulder.y);
    ctx.stroke();

    // Specific clothing style details
    if (style === 'workwear') {
      // Overalls bib & suspenders
      ctx.strokeStyle = appearance.pantsColor || PALETTE.PANTS_DEFAULT;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(joints.hip.x - 2, joints.hip.y);
      ctx.lineTo(joints.shoulder.x - 2, joints.shoulder.y + 4);
      ctx.moveTo(joints.hip.x + 2, joints.hip.y);
      ctx.lineTo(joints.shoulder.x + 2, joints.shoulder.y + 4);
      ctx.stroke();

      // Front bib
      ctx.fillStyle = appearance.pantsColor || PALETTE.PANTS_DEFAULT;
      ctx.fillRect(joints.hip.x - 3, (joints.hip.y + joints.shoulder.y) / 2 - 2, 6, 8);

      // Buckle buttons
      ctx.fillStyle = PALETTE.PAPER;
      ctx.beginPath();
      ctx.arc(joints.shoulder.x - 2, joints.shoulder.y + 5, 1, 0, Math.PI * 2);
      ctx.arc(joints.shoulder.x + 2, joints.shoulder.y + 5, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'jacket') {
      // Open jacket sides
      ctx.strokeStyle = '#2b2a28';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(joints.shoulder.x - 4, joints.shoulder.y + 2);
      ctx.lineTo(joints.hip.x - 4, joints.hip.y);
      ctx.moveTo(joints.shoulder.x + 4, joints.shoulder.y + 2);
      ctx.lineTo(joints.hip.x + 4, joints.hip.y);
      ctx.stroke();

      // Collar notches
      ctx.beginPath();
      ctx.moveTo(joints.shoulder.x - 4, joints.shoulder.y + 2);
      ctx.lineTo(joints.shoulder.x - 1, joints.shoulder.y + 6);
      ctx.stroke();
    }

    // Outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;

    ctx.beginPath();
    ctx.moveTo(joints.hip.x, joints.hip.y);
    ctx.lineTo(joints.shoulder.x, joints.shoulder.y);
    ctx.stroke();
  }

  /**
   * Draw arms with optional weapon and melee slash effect.
   */
  _drawArms(ctx, joints, appearance, isAttacking = false, attackProgress = 0) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shirt sleeves
    ctx.strokeStyle = appearance.shirtColor || PALETTE.SHIRT_DEFAULT;
    ctx.lineWidth = BODY.OUTLINE_WIDTH + 2;

    // Left arm upper
    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(joints.leftElbow.x, joints.leftElbow.y);
    ctx.stroke();

    // Right arm upper
    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(joints.rightElbow.x, joints.rightElbow.y);
    ctx.stroke();

    // Skin on forearms
    ctx.strokeStyle = appearance.skinColor || PALETTE.SKIN_DEFAULT;
    ctx.lineWidth = BODY.OUTLINE_WIDTH + 1;

    ctx.beginPath();
    ctx.moveTo(joints.leftElbow.x, joints.leftElbow.y);
    ctx.lineTo(joints.leftHand.x, joints.leftHand.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(joints.rightElbow.x, joints.rightElbow.y);
    ctx.lineTo(joints.rightHand.x, joints.rightHand.y);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;

    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(joints.leftElbow.x, joints.leftElbow.y);
    ctx.lineTo(joints.leftHand.x, joints.leftHand.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(joints.rightElbow.x, joints.rightElbow.y);
    ctx.lineTo(joints.rightHand.x, joints.rightHand.y);
    ctx.stroke();

    // Hands
    ctx.fillStyle = appearance.skinColor || PALETTE.SKIN_DEFAULT;
    ctx.beginPath();
    ctx.arc(joints.leftHand.x, joints.leftHand.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(joints.rightHand.x, joints.rightHand.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Melee Weapon & Slash Arc when attacking
    if (isAttacking) {
      // Sturdy wooden timber club / tool in right hand
      ctx.save();
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(joints.rightHand.x, joints.rightHand.y);
      ctx.lineTo(joints.rightHand.x + 18, joints.rightHand.y - 12);
      ctx.stroke();

      // Outline on weapon
      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dynamic swoosh arc slash trail
      const alpha = Math.max(0, 0.7 - attackProgress * 0.5);
      ctx.strokeStyle = `rgba(240, 240, 240, ${alpha})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(joints.shoulder.x + 4, joints.shoulder.y, 32, -0.7, 1.4);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Draw head with customizable hair styles and face details.
   */
  _drawHead(ctx, joints, appearance) {
    const hx = joints.head.x;
    const hy = joints.head.y;
    const r = BODY.HEAD_RADIUS;

    // Neck
    ctx.strokeStyle = appearance.skinColor || PALETTE.SKIN_DEFAULT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(hx, hy + r);
    ctx.stroke();

    // Head circle (skin)
    ctx.fillStyle = appearance.skinColor || PALETTE.SKIN_DEFAULT;
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();

    // Head outline (ink)
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Hair
    this._drawHair(ctx, hx, hy, r, appearance.hairColor, appearance.hairStyle, joints);

    // Face (eyes and mouth)
    const eyeOffset = 3;
    const eyeY = hy - 1;

    ctx.fillStyle = PALETTE.OUTLINE;
    // Eyes
    ctx.beginPath();
    ctx.arc(hx - eyeOffset + 1, eyeY, BODY.EYE_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + eyeOffset - 1, eyeY, BODY.EYE_SIZE * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy + 4);
    ctx.lineTo(hx + 2, hy + 4);
    ctx.stroke();
  }

  /**
   * Draw hair with multiple styles: 'short', 'messy', 'ponytail', 'bald'.
   */
  _drawHair(ctx, hx, hy, r, hairColor, hairStyle = 'messy', joints = null) {
    if (hairStyle === 'bald') {
      // Subtle ink hairline fringe
      ctx.strokeStyle = 'rgba(41, 41, 39, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx, hy, r - 1, Math.PI * 0.9, Math.PI * 1.5);
      ctx.stroke();
      return;
    }

    ctx.fillStyle = hairColor || PALETTE.HAIR_DEFAULT;
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.5;

    if (hairStyle === 'short') {
      // Neat trimmed cap
      ctx.beginPath();
      ctx.arc(hx, hy, r + 1, Math.PI, 0, false);
      ctx.lineTo(hx + r + 1, hy);
      ctx.quadraticCurveTo(hx + r * 0.4, hy - r * 0.8, hx, hy - r * 0.9);
      ctx.quadraticCurveTo(hx - r * 0.5, hy - r * 0.8, hx - r - 1, hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hairStyle === 'ponytail') {
      // Rounded hair cap
      ctx.beginPath();
      ctx.arc(hx, hy, r + 1, Math.PI, 0, false);
      ctx.lineTo(hx + r + 1, hy);
      ctx.quadraticCurveTo(hx, hy - r * 0.6, hx - r - 1, hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hair tie & ponytail extending backward
      const tieX = hx - r - 1;
      const tieY = hy - 1;
      ctx.fillStyle = PALETTE.PAPER;
      ctx.beginPath();
      ctx.arc(tieX, tieY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Ponytail curve
      ctx.fillStyle = hairColor || PALETTE.HAIR_DEFAULT;
      ctx.beginPath();
      ctx.moveTo(tieX, tieY - 2);
      ctx.quadraticCurveTo(tieX - 9, tieY + 4, tieX - 12, tieY + 12);
      ctx.quadraticCurveTo(tieX - 6, tieY + 10, tieX, tieY + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Messy (default hand-drawn spiky style)
      ctx.beginPath();
      ctx.arc(hx, hy, r + 1, Math.PI, 0, false);
      ctx.lineTo(hx + r + 3, hy - 2);
      ctx.lineTo(hx + r - 2, hy - r * 0.3);
      ctx.lineTo(hx + 4, hy - r - 3);
      ctx.lineTo(hx, hy - r - 1);
      ctx.lineTo(hx - 4, hy - r - 4);
      ctx.lineTo(hx - r + 2, hy - r * 0.3);
      ctx.lineTo(hx - r - 2, hy - 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}
