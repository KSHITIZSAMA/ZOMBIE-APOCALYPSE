/**
 * CharacterRenderer — Draws jointed, highly detailed stickman characters with hand-drawn ink style.
 * Features contoured anatomy, expressive survivor eyes with pupil glints, detailed survival boots with laces,
 * tactical crossbody bandolier strap, belt buckles, rolled sleeve cuffs, survival watch, and multi-layered hair.
 */

import { PALETTE } from '../data/balance.js';

/** Stickman body proportions (in pixels from feet) */
const BODY = {
  HEAD_RADIUS: 9.5,
  NECK_Y: 46,
  SHOULDER_Y: 43,
  HIP_Y: 22,
  TORSO_WIDTH: 7,
  ARM_UPPER: 14,
  ARM_LOWER: 13,
  LEG_UPPER: 14,
  LEG_LOWER: 13,
  FOOT_LENGTH: 8,
  EYE_SIZE: 2.8,
  OUTLINE_WIDTH: 2.2,
  TOTAL_HEIGHT: 58,
};

export class CharacterRenderer {
  /**
   * Draw a high-detail stickman character.
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

    // 1. Ground contact shadow (drawn unscaled for realistic floor contact)
    this._drawGroundShadow(ctx, walkPhase, isWalking);

    ctx.scale(facing, 1); // Flip for facing direction

    // Calculate joint positions from walk phase and attack state
    const joints = this._calculateJoints(walkPhase, isWalking, isAttacking, attackProgress);

    // Draw in layered order: back leg -> back arm -> torso -> head -> front leg -> front arm
    this._drawBackLeg(ctx, joints, appearance);
    this._drawBackArm(ctx, joints, appearance);
    this._drawTorso(ctx, joints, appearance);
    this._drawHead(ctx, joints, appearance);
    this._drawFrontLeg(ctx, joints, appearance);
    this._drawFrontArm(ctx, joints, appearance, isAttacking, attackProgress);

    ctx.restore();
  }

  /**
   * Soft ambient contact shadow on the ground surface.
   * @private
   */
  _drawGroundShadow(ctx, walkPhase, isWalking) {
    const pulse = isWalking ? Math.sin(walkPhase * Math.PI * 2) * 1.5 : 0;
    const shadowW = 18 + pulse;
    const shadowH = 4.5 - pulse * 0.4;

    ctx.fillStyle = 'rgba(18, 20, 24, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 0, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Calculate all joint positions for the current animation frame.
   * @param {number} phase - [0, 1] walk cycle
   * @param {boolean} isWalking
   * @param {boolean} [isAttacking]
   * @param {number} [attackProgress]
   * @returns {object} Joint positions
   * @private
   */
  _calculateJoints(phase, isWalking, isAttacking = false, attackProgress = 0) {
    const sin = Math.sin(phase * Math.PI * 2);

    // Walk animation parameters
    const walkSwing = isWalking ? 0.46 : 0;
    const bodyBob = isWalking ? Math.abs(sin) * 2.2 : 0;
    const bodyLean = isWalking ? sin * 0.04 : 0;

    // Hip position (center of body)
    const hipX = 0;
    const hipY = -(BODY.HIP_Y + bodyBob);

    // Shoulder position
    const shoulderX = hipX + Math.sin(bodyLean) * (BODY.SHOULDER_Y - BODY.HIP_Y);
    const shoulderY = -(BODY.SHOULDER_Y + bodyBob);

    // Head
    const headX = shoulderX + (isWalking ? 0.5 : 0);
    const headY = -(BODY.NECK_Y + bodyBob + BODY.HEAD_RADIUS);

    // Leg angles
    const leftLegSwing = sin * walkSwing;
    const rightLegSwing = -sin * walkSwing;

    // Left leg (back)
    const leftKneeX = hipX + Math.sin(leftLegSwing) * BODY.LEG_UPPER;
    const leftKneeY = hipY + Math.cos(leftLegSwing) * BODY.LEG_UPPER;
    const leftKneeAngle = leftLegSwing * 0.5 - (isWalking ? Math.max(0, sin) * 0.38 : 0);
    const leftFootX = leftKneeX + Math.sin(leftKneeAngle) * BODY.LEG_LOWER;
    const leftFootY = leftKneeY + Math.cos(leftKneeAngle) * BODY.LEG_LOWER;

    // Right leg (front)
    const rightKneeX = hipX + Math.sin(rightLegSwing) * BODY.LEG_UPPER;
    const rightKneeY = hipY + Math.cos(rightLegSwing) * BODY.LEG_UPPER;
    const rightKneeAngle = rightLegSwing * 0.5 - (isWalking ? Math.max(0, -sin) * 0.38 : 0);
    const rightFootX = rightKneeX + Math.sin(rightKneeAngle) * BODY.LEG_LOWER;
    const rightFootY = rightKneeY + Math.cos(rightKneeAngle) * BODY.LEG_LOWER;

    let leftElbowX, leftElbowY, leftHandX, leftHandY;
    let rightElbowX, rightElbowY, rightHandX, rightHandY;

    if (isAttacking) {
      // Dynamic forward melee strike swing
      const swingAngle = -1.35 + attackProgress * 2.7;
      rightElbowX = shoulderX + Math.sin(swingAngle) * (BODY.ARM_UPPER * 0.95);
      rightElbowY = shoulderY + Math.cos(swingAngle) * (BODY.ARM_UPPER * 0.95);
      rightHandX = rightElbowX + Math.sin(swingAngle + 0.38) * (BODY.ARM_LOWER * 1.2);
      rightHandY = rightElbowY + Math.cos(swingAngle + 0.38) * (BODY.ARM_LOWER * 1.2);

      // Left arm balances back
      leftElbowX = shoulderX - 8;
      leftElbowY = shoulderY + 8;
      leftHandX = leftElbowX - 6;
      leftHandY = leftElbowY + 6;
    } else {
      // Normal walk / idle arm swing
      const leftArmSwing = -sin * walkSwing * 0.65;
      const rightArmSwing = sin * walkSwing * 0.65;

      leftElbowX = shoulderX + Math.sin(leftArmSwing) * BODY.ARM_UPPER;
      leftElbowY = shoulderY + Math.cos(leftArmSwing) * BODY.ARM_UPPER;
      const leftArmAngle = leftArmSwing * 0.35 + (isWalking ? 0.2 : 0.1);
      leftHandX = leftElbowX + Math.sin(leftArmAngle) * BODY.ARM_LOWER;
      leftHandY = leftElbowY + Math.cos(leftArmAngle) * BODY.ARM_LOWER;

      rightElbowX = shoulderX + Math.sin(rightArmSwing) * BODY.ARM_UPPER;
      rightElbowY = shoulderY + Math.cos(rightArmSwing) * BODY.ARM_UPPER;
      const rightArmAngle = rightArmSwing * 0.35 + (isWalking ? 0.2 : 0.1);
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
   * Draw back leg with shaded pants and survival boot.
   * @private
   */
  _drawBackLeg(ctx, joints, appearance) {
    this._drawSingleLeg(ctx, joints.hip.x - 2, joints.hip.y, joints.leftKnee, joints.leftFoot, appearance, true);
  }

  /**
   * Draw front leg with cargo pocket and detailed laced boot.
   * @private
   */
  _drawFrontLeg(ctx, joints, appearance) {
    this._drawSingleLeg(ctx, joints.hip.x + 2, joints.hip.y, joints.rightKnee, joints.rightFoot, appearance, false);
  }

  /**
   * Draw an individual contoured leg with fabric creases, cargo pocket, and survival boot.
   * @private
   */
  _drawSingleLeg(ctx, hipX, hipY, knee, foot, appearance, isBack = false) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pantsColor = appearance.pantsColor || PALETTE.PANTS_DEFAULT;
    const shoeColor = appearance.shoeColor || PALETTE.SHOE_DEFAULT;

    // 1. Thigh & Calf Fabric Fill
    ctx.strokeStyle = isBack ? this._darkenColor(pantsColor, 0.25) : pantsColor;
    ctx.lineWidth = BODY.OUTLINE_WIDTH + 3.2;

    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();

    // 2. Ink Outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();

    // 3. Knee Seam & Cargo Pocket (front leg only)
    if (!isBack) {
      // Knee crease
      ctx.strokeStyle = 'rgba(25, 25, 23, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(knee.x - 2, knee.y);
      ctx.lineTo(knee.x + 2, knee.y);
      ctx.stroke();

      // Cargo pocket on thigh
      const midThighX = (hipX + knee.x) / 2 + 1.5;
      const midThighY = (hipY + knee.y) / 2;
      ctx.fillStyle = this._darkenColor(pantsColor, 0.15);
      ctx.fillRect(midThighX - 2.5, midThighY - 3, 5, 6);
      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.0;
      ctx.strokeRect(midThighX - 2.5, midThighY - 3, 5, 6);
      // Flap button
      ctx.fillStyle = '#c9983e';
      ctx.fillRect(midThighX - 0.7, midThighY - 2, 1.4, 1.4);
    }

    // 4. Survival Boot (detailed sole, leather upper, collar, and laces)
    const bootW = BODY.FOOT_LENGTH + 2;
    const soleY = foot.y;

    // Boot leather body
    ctx.fillStyle = isBack ? this._darkenColor(shoeColor, 0.3) : shoeColor;
    ctx.beginPath();
    ctx.moveTo(foot.x - 2, foot.y - 6); // ankle back
    ctx.lineTo(foot.x + 3, foot.y - 6); // ankle front
    ctx.lineTo(foot.x + bootW, foot.y - 2); // toe front
    ctx.lineTo(foot.x + bootW, foot.y); // toe sole
    ctx.lineTo(foot.x - 2.5, foot.y); // heel sole
    ctx.closePath();
    ctx.fill();

    // Boot outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Heavy tread lug sole
    ctx.strokeStyle = '#151618';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(foot.x - 3, soleY);
    ctx.lineTo(foot.x + bootW, soleY);
    ctx.stroke();

    // Cross-laces on boot (front leg only)
    if (!isBack) {
      ctx.strokeStyle = '#e6e0d2';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(foot.x + 1, foot.y - 5);
      ctx.lineTo(foot.x + 4, foot.y - 3);
      ctx.moveTo(foot.x + 4, foot.y - 5);
      ctx.lineTo(foot.x + 1, foot.y - 3);
      ctx.stroke();
    }
  }

  /**
   * Draw torso with anatomical contour, fabric folds, survival strap, and belt buckle.
   * @private
   */
  _drawTorso(ctx, joints, appearance) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const style = appearance.clothingStyle || 'casual';
    const shirtColor = appearance.shirtColor || PALETTE.SHIRT_DEFAULT;

    // 1. Contoured Torso Body (trapezoid tapering from broad shoulders to waist)
    const shX = joints.shoulder.x;
    const shY = joints.shoulder.y;
    const hipX = joints.hip.x;
    const hipY = joints.hip.y;

    // Shirt fill
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.moveTo(shX - 4.5, shY);
    ctx.lineTo(shX + 4.5, shY);
    ctx.lineTo(hipX + 3.2, hipY);
    ctx.lineTo(hipX - 3.2, hipY);
    ctx.closePath();
    ctx.fill();

    // Shaded side for 3D depth
    ctx.fillStyle = 'rgba(15, 17, 21, 0.2)';
    ctx.beginPath();
    ctx.moveTo(shX - 4.5, shY);
    ctx.lineTo(shX - 1, shY);
    ctx.lineTo(hipX - 1, hipY);
    ctx.lineTo(hipX - 3.2, hipY);
    ctx.closePath();
    ctx.fill();

    // Torso outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(shX - 4.5, shY);
    ctx.lineTo(shX + 4.5, shY);
    ctx.lineTo(hipX + 3.2, hipY);
    ctx.lineTo(hipX - 3.2, hipY);
    ctx.closePath();
    ctx.stroke();

    // 2. Collar & Neckline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(shX - 2.5, shY);
    ctx.lineTo(shX, shY + 3.5);
    ctx.lineTo(shX + 2.5, shY);
    ctx.stroke();

    // 3. Diagonal Crossbody Survival Strap (leather bandolier across chest)
    ctx.strokeStyle = '#423021';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(shX - 3.5, shY + 1);
    ctx.lineTo(hipX + 2.5, hipY - 2);
    ctx.stroke();

    // Brass strap buckle
    const strapMidX = (shX - 3.5 + hipX + 2.5) / 2;
    const strapMidY = (shY + 1 + hipY - 2) / 2;
    ctx.fillStyle = '#c9983e';
    ctx.fillRect(strapMidX - 1.2, strapMidY - 1.2, 2.4, 2.4);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(strapMidX - 1.2, strapMidY - 1.2, 2.4, 2.4);

    // 4. Style-Specific Details
    if (style === 'workwear') {
      // Overalls bib & dual suspenders
      const pantsColor = appearance.pantsColor || PALETTE.PANTS_DEFAULT;
      ctx.strokeStyle = pantsColor;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(hipX - 2.8, hipY);
      ctx.lineTo(shX - 2.2, shY + 2);
      ctx.moveTo(hipX + 2.8, hipY);
      ctx.lineTo(shX + 2.2, shY + 2);
      ctx.stroke();

      // Brass dungaree clips
      ctx.fillStyle = '#c9983e';
      ctx.fillRect(shX - 3.2, shY + 3, 2, 2);
      ctx.fillRect(shX + 1.2, shY + 3, 2, 2);

      // Front chest pouch
      ctx.fillStyle = pantsColor;
      ctx.fillRect(hipX - 2.2, (hipY + shY) / 2 - 2, 4.4, 5.5);
      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.0;
      ctx.strokeRect(hipX - 2.2, (hipY + shY) / 2 - 2, 4.4, 5.5);
    } else if (style === 'jacket') {
      // Weathered field jacket collar and zipper placket
      ctx.strokeStyle = '#262422';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(shX - 4.5, shY + 2);
      ctx.lineTo(hipX - 3.5, hipY);
      ctx.moveTo(shX + 4.5, shY + 2);
      ctx.lineTo(hipX + 3.5, hipY);
      ctx.stroke();

      // Central brass zipper
      ctx.strokeStyle = '#b8924b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(shX, shY + 4);
      ctx.lineTo(hipX, hipY - 2);
      ctx.stroke();
    }

    // 5. Sturdy Waist Belt with Polished Metal Buckle
    ctx.fillStyle = '#261c14';
    ctx.fillRect(hipX - 3.5, hipY - 2.5, 7, 2.8);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.0;
    ctx.strokeRect(hipX - 3.5, hipY - 2.5, 7, 2.8);

    // Belt Buckle
    ctx.fillStyle = '#d8b872';
    ctx.fillRect(hipX - 1.2, hipY - 2.8, 2.4, 3.4);
    ctx.strokeStyle = '#181410';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(hipX - 1.2, hipY - 2.8, 2.4, 3.4);
  }

  /**
   * Draw back arm.
   * @private
   */
  _drawBackArm(ctx, joints, appearance) {
    this._drawSingleArm(ctx, joints.shoulder, joints.leftElbow, joints.leftHand, appearance, false, false, 0, true);
  }

  /**
   * Draw front arm with wrist watch, fingers, weapon, and attack trail.
   * @private
   */
  _drawFrontArm(ctx, joints, appearance, isAttacking = false, attackProgress = 0) {
    this._drawSingleArm(ctx, joints.shoulder, joints.rightElbow, joints.rightHand, appearance, true, isAttacking, attackProgress, false);
  }

  /**
   * Draw single arm with sleeve cuffs, forearm skin, tactical watch, and hand.
   * @private
   */
  _drawSingleArm(ctx, shoulder, elbow, hand, appearance, isFront, isAttacking = false, attackProgress = 0, isBack = false) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const shirtColor = appearance.shirtColor || PALETTE.SHIRT_DEFAULT;
    const skinColor = appearance.skinColor || PALETTE.SKIN_DEFAULT;

    // 1. Shirt Sleeve (Upper Arm)
    ctx.strokeStyle = isBack ? this._darkenColor(shirtColor, 0.25) : shirtColor;
    ctx.lineWidth = BODY.OUTLINE_WIDTH + 2.4;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.stroke();

    // Rolled sleeve cuff ring at elbow
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(elbow.x, elbow.y, 2.2, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Forearm (Skin)
    ctx.strokeStyle = isBack ? this._darkenColor(skinColor, 0.2) : skinColor;
    ctx.lineWidth = BODY.OUTLINE_WIDTH + 1.2;
    ctx.beginPath();
    ctx.moveTo(elbow.x, elbow.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();

    // Forearm outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(elbow.x, elbow.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();

    // 3. Tactical Survival Watch (on left / front arm)
    if (!isBack && !isAttacking) {
      const midForearmX = (elbow.x + hand.x) / 2 + 1;
      const midForearmY = (elbow.y + hand.y) / 2;
      ctx.fillStyle = '#1c1f24';
      ctx.beginPath();
      ctx.arc(midForearmX, midForearmY, 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9983e';
      ctx.fillRect(midForearmX - 0.6, midForearmY - 0.6, 1.2, 1.2);
    }

    // 4. Detailed Hand with Thumb
    ctx.fillStyle = isBack ? this._darkenColor(skinColor, 0.2) : skinColor;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Thumb projection
    ctx.beginPath();
    ctx.arc(hand.x + 1.6, hand.y - 1.2, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 5. Spiked Melee Weapon & High-Impact Slash FX
    if (isAttacking && isFront) {
      ctx.save();

      // Weapon: Reinforced Heavy Timber Club with Spikes
      const wepStartX = hand.x;
      const wepStartY = hand.y;
      const wepEndX = hand.x + 22;
      const wepEndY = hand.y - 15;

      // Wooden body
      ctx.strokeStyle = '#7c4d28';
      ctx.lineWidth = 4.8;
      ctx.beginPath();
      ctx.moveTo(wepStartX, wepStartY);
      ctx.lineTo(wepEndX, wepEndY);
      ctx.stroke();

      // Wood grain / outline
      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // White cloth handle wrap
      ctx.strokeStyle = '#e6e0d2';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(wepStartX, wepStartY);
      ctx.lineTo(wepStartX + 6, wepStartY - 4);
      ctx.stroke();

      // Iron nails/spikes through the tip
      ctx.strokeStyle = '#c4c8cc';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(wepEndX - 3, wepEndY + 4);
      ctx.lineTo(wepEndX + 3, wepEndY - 4);
      ctx.stroke();

      // Dynamic High-Contrast Slash Arc
      const trailAlpha = Math.max(0, 0.85 - attackProgress * 0.65);
      ctx.strokeStyle = `rgba(255, 255, 255, ${trailAlpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(shoulder.x + 3, shoulder.y, 34, -0.75, 1.45);
      ctx.stroke();

      // Sharp inner speed core
      ctx.strokeStyle = `rgba(255, 220, 140, ${trailAlpha + 0.15})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.restore();
    }
  }

  /**
   * Draw expressive head with detailed eyes, pupils with glints, survivor eyebrows, and mouth.
   * @private
   */
  _drawHead(ctx, joints, appearance) {
    const hx = joints.head.x;
    const hy = joints.head.y;
    const r = BODY.HEAD_RADIUS;
    const skinColor = appearance.skinColor || PALETTE.SKIN_DEFAULT;

    // 1. Neck with collarbone
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(hx, hy + r - 1);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 2. Head Silhouette
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();

    // Head ink outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Ear contour on side
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(hx - r * 0.65, hy + 0.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // 3. Hair (detailed multi-strand layer)
    this._drawHair(ctx, hx, hy, r, appearance.hairColor, appearance.hairStyle);

    // 4. Expressive Eyes & Brows
    // Sclera (White eye backing)
    const eyeX = hx + 2.5;
    const eyeY = hy - 0.5;

    ctx.fillStyle = '#fbf9f4';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 3.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Iris / Pupil (focused looking right/forward)
    ctx.fillStyle = '#1a1917';
    ctx.beginPath();
    ctx.arc(eyeX + 1.0, eyeY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // White Pupil Glint (gives life & alertness!)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX + 0.6, eyeY - 0.8, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Determined, focused survivor eyebrow
    ctx.strokeStyle = '#1b1a18';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeX - 2.5, eyeY - 3.4);
    ctx.lineTo(eyeX + 3.0, eyeY - 2.8);
    ctx.stroke();

    // 5. Nose & Mouth
    // Nose bridge hint
    ctx.strokeStyle = 'rgba(25, 25, 23, 0.5)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.75, hy - 0.5);
    ctx.lineTo(hx + r * 0.95, hy + 1.2);
    ctx.stroke();

    // Resolute survivor mouth
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx + 0.5, hy + 4.2);
    ctx.lineTo(hx + 4.8, hy + 4.0);
    ctx.stroke();
  }

  /**
   * Draw high-detail multi-strand hand-drawn hair.
   * @private
   */
  _drawHair(ctx, hx, hy, r, hairColor, hairStyle = 'messy') {
    if (hairStyle === 'bald') {
      // Shaved scalp stubble texture
      ctx.strokeStyle = 'rgba(40, 38, 35, 0.45)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(hx, hy, r - 0.8, Math.PI * 0.85, Math.PI * 1.55);
      ctx.stroke();
      return;
    }

    const color = hairColor || PALETTE.HAIR_DEFAULT;
    const shadowColor = this._darkenColor(color, 0.3);
    const highlightColor = this._lightenColor(color, 0.25);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (hairStyle === 'short') {
      // Clean trimmed hair cap with texture
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hx, hy, r + 1.2, Math.PI * 0.95, 0.1, false);
      ctx.lineTo(hx + r + 1.2, hy);
      ctx.quadraticCurveTo(hx + r * 0.4, hy - r * 0.9, hx, hy - r * 1.0);
      ctx.quadraticCurveTo(hx - r * 0.5, hy - r * 0.9, hx - r - 1.2, hy);
      ctx.closePath();
      ctx.fill();

      // Textured parting lines
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - r * 0.85);
      ctx.lineTo(hx + 3, hy - r * 0.75);
      ctx.stroke();

      // Ink outline
      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (hairStyle === 'ponytail') {
      // Rounded hair cap
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hx, hy, r + 1.2, Math.PI * 0.95, 0.1, false);
      ctx.lineTo(hx + r + 1.2, hy);
      ctx.quadraticCurveTo(hx, hy - r * 0.75, hx - r - 1.2, hy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hair tie band
      const tieX = hx - r - 1.5;
      const tieY = hy - 1.5;
      ctx.fillStyle = '#c9983e';
      ctx.beginPath();
      ctx.arc(tieX, tieY, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Sweeping layered ponytail tail
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tieX, tieY - 2.5);
      ctx.quadraticCurveTo(tieX - 11, tieY + 4, tieX - 14, tieY + 14);
      ctx.quadraticCurveTo(tieX - 7, tieY + 11, tieX, tieY + 3.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else {
      // Messy (spiky, layered survivor hair)
      // Under shadow layer
      ctx.fillStyle = shadowColor;
      ctx.beginPath();
      ctx.arc(hx, hy, r + 1.8, Math.PI * 0.9, 0.1, false);
      ctx.lineTo(hx + r + 4, hy - 2);
      ctx.lineTo(hx + 5, hy - r - 4);
      ctx.lineTo(hx - 5, hy - r - 5);
      ctx.lineTo(hx - r - 3, hy - 1);
      ctx.closePath();
      ctx.fill();

      // Main hair tufts
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hx, hy, r + 1.2, Math.PI * 0.95, 0.05, false);
      ctx.lineTo(hx + r + 3.5, hy - 3);
      ctx.lineTo(hx + r - 1, hy - r * 0.35);
      ctx.lineTo(hx + 5, hy - r - 3.5);
      ctx.lineTo(hx + 1, hy - r - 1.5);
      ctx.lineTo(hx - 4.5, hy - r - 4.2);
      ctx.lineTo(hx - r + 1.5, hy - r * 0.35);
      ctx.lineTo(hx - r - 2.5, hy - 1);
      ctx.closePath();
      ctx.fill();

      // Highlight streak
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - r - 1);
      ctx.lineTo(hx + 4, hy - r - 1.5);
      ctx.stroke();

      // Ink outline
      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /**
   * Darken a hex color for shadows and depth.
   * @private
   */
  _darkenColor(hex, factor = 0.25) {
    if (!hex || !hex.startsWith('#')) return '#222222';
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    r = Math.max(0, Math.round(r * (1 - factor)));
    g = Math.max(0, Math.round(g * (1 - factor)));
    b = Math.max(0, Math.round(b * (1 - factor)));

    return `rgb(${r},${g},${b})`;
  }

  /**
   * Lighten a hex color for highlights.
   * @private
   */
  _lightenColor(hex, factor = 0.25) {
    if (!hex || !hex.startsWith('#')) return '#ffffff';
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    r = Math.min(255, Math.round(r + (255 - r) * factor));
    g = Math.min(255, Math.round(g + (255 - g) * factor));
    b = Math.min(255, Math.round(b + (255 - b) * factor));

    return `rgb(${r},${g},${b})`;
  }
}
