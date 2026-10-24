/**
 * ZombieRenderer — Hand-drawn stickman renderer for the infected undead.
 * Features decayed greenish skin, torn tattered clothes, hunched posture,
 * outstretched grasping arms, and floating combat health meter.
 */

import { PALETTE } from '../data/balance.js';

const ZOMBIE_BODY = {
  HEAD_RADIUS: 9.5,
  NECK_Y: 41,        // Slightly lower neck for hunched stance
  SHOULDER_Y: 38,
  HIP_Y: 20,
  ARM_UPPER: 13,
  ARM_LOWER: 13,
  LEG_UPPER: 14,
  LEG_LOWER: 12,
  OUTLINE_WIDTH: 2.5,
};

export class ZombieRenderer {
  /**
   * Draw an infected walker stickman.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Screen X (feet center).
   * @param {number} y - Screen Y (feet on ground).
   * @param {import('../entities/Zombie.js').Zombie} zombie
   * @param {number} gameTime - Total game time for subtle shivering.
   */
  draw(ctx, x, y, zombie, gameTime = 0) {
    if (zombie.isDead) {
      this._drawCorpse(ctx, x, y, zombie.facing);
      return;
    }

    ctx.save();
    ctx.translate(x, y);

    // Ground contact shadow
    ctx.fillStyle = 'rgba(18, 20, 24, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(zombie.facing, 1);

    const phase = zombie.getWalkPhase();
    const isAttacking = zombie.isAttacking;
    const isStunned = zombie.stunTimer > 0;

    // Calculate joint positions for hunched shambling zombie
    const joints = this._calculateJoints(phase, zombie.state, isAttacking, gameTime);

    // Render body parts
    this._drawLegs(ctx, joints, isStunned);
    this._drawTorso(ctx, joints, isStunned, zombie.type);
    this._drawArms(ctx, joints, isAttacking, isStunned, zombie.type);
    this._drawHead(ctx, joints, isStunned, gameTime, zombie.type);

    ctx.restore();

    // Floating HP bar (non-flipped screen coordinate space)
    if (zombie.health < zombie.maxHealth) {
      this._drawHealthBar(ctx, x, y - 60, zombie.health, zombie.maxHealth);
    }
  }

  /**
   * Calculate joint positions for shambling zombie.
   * @private
   */
  _calculateJoints(phase, state, isAttacking, gameTime) {
    const isMoving = state === 'chase' || state === 'patrol';
    const sin = Math.sin(phase * Math.PI * 2);

    // Uneven shambling limp
    const legSwing = isMoving ? sin * 0.38 : 0;
    const twitch = Math.sin(gameTime * 12) * 0.8;

    const hipX = 0;
    const hipY = -ZOMBIE_BODY.HIP_Y;

    // Hunched forward spine
    const shoulderX = hipX + 7;
    const shoulderY = -ZOMBIE_BODY.SHOULDER_Y + twitch;

    // Drooping head
    const headX = shoulderX + 5;
    const headY = -ZOMBIE_BODY.NECK_Y - ZOMBIE_BODY.HEAD_RADIUS + twitch;

    // Legs
    const leftLegAngle = legSwing * 0.9;
    const rightLegAngle = -legSwing * 1.2; // Asymmetric dragging leg

    const leftKneeX = hipX + Math.sin(leftLegAngle) * ZOMBIE_BODY.LEG_UPPER;
    const leftKneeY = hipY + Math.cos(leftLegAngle) * ZOMBIE_BODY.LEG_UPPER;
    const leftFootX = leftKneeX + Math.sin(leftLegAngle * 0.6) * ZOMBIE_BODY.LEG_LOWER;
    const leftFootY = leftKneeY + Math.cos(leftLegAngle * 0.6) * ZOMBIE_BODY.LEG_LOWER;

    const rightKneeX = hipX + Math.sin(rightLegAngle) * ZOMBIE_BODY.LEG_UPPER;
    const rightKneeY = hipY + Math.cos(rightLegAngle) * ZOMBIE_BODY.LEG_UPPER;
    const rightFootX = rightKneeX + Math.sin(rightLegAngle * 0.4) * ZOMBIE_BODY.LEG_LOWER;
    const rightFootY = rightKneeY + Math.cos(rightLegAngle * 0.4) * ZOMBIE_BODY.LEG_LOWER;

    // Arms: Reaching forward in aggressive grasp
    let armReachX = 14;
    let armReachY = 4;
    if (isAttacking) {
      armReachX = 22; // Lunge forward
      armReachY = -2;
    }

    const leftHandX = shoulderX + armReachX;
    const leftHandY = shoulderY + armReachY + twitch;

    const rightHandX = shoulderX + armReachX - 3;
    const rightHandY = shoulderY + armReachY + 4 + twitch;

    return {
      head: { x: headX, y: headY },
      shoulder: { x: shoulderX, y: shoulderY },
      hip: { x: hipX, y: hipY },
      leftKnee: { x: leftKneeX, y: leftKneeY },
      leftFoot: { x: leftFootX, y: leftFootY },
      rightKnee: { x: rightKneeX, y: rightKneeY },
      rightFoot: { x: rightFootX, y: rightFootY },
      leftHand: { x: leftHandX, y: leftHandY },
      rightHand: { x: rightHandX, y: rightHandY },
    };
  }

  /**
   * Draw rotting legs and torn pants.
   */
  _drawLegs(ctx, joints, isStunned) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Ripped pants color
    ctx.strokeStyle = isStunned ? '#e8d4d4' : '#2d2822';
    ctx.lineWidth = ZOMBIE_BODY.OUTLINE_WIDTH + 2;

    ctx.beginPath();
    ctx.moveTo(joints.hip.x - 2, joints.hip.y);
    ctx.lineTo(joints.leftKnee.x, joints.leftKnee.y);
    ctx.lineTo(joints.leftFoot.x, joints.leftFoot.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(joints.hip.x + 2, joints.hip.y);
    ctx.lineTo(joints.rightKnee.x, joints.rightKnee.y);
    ctx.lineTo(joints.rightFoot.x, joints.rightFoot.y);
    ctx.stroke();

    // Dark outline
    ctx.strokeStyle = '#181b16';
    ctx.lineWidth = ZOMBIE_BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(joints.hip.x - 2, joints.hip.y);
    ctx.lineTo(joints.leftKnee.x, joints.leftKnee.y);
    ctx.lineTo(joints.leftFoot.x, joints.leftFoot.y);
    ctx.moveTo(joints.hip.x + 2, joints.hip.y);
    ctx.lineTo(joints.rightKnee.x, joints.rightKnee.y);
    ctx.lineTo(joints.rightFoot.x, joints.rightFoot.y);
    ctx.stroke();
  }

  /**
   * Draw hunched decaying torso.
   */
  _drawTorso(ctx, joints, isStunned, type = 'walker') {
    ctx.lineCap = 'round';
    const isRunner = type === 'runner';
    const shirtColor = isRunner ? '#6e2d2d' : '#453f36'; // Red-stained torn shirt for runners
    ctx.strokeStyle = isStunned ? '#f0dcdc' : shirtColor;
    ctx.lineWidth = isRunner ? 5.5 : 7; // Runners are leaner

    ctx.beginPath();
    ctx.moveTo(joints.hip.x, joints.hip.y);
    ctx.lineTo(joints.shoulder.x, joints.shoulder.y);
    ctx.stroke();

    // Rot stains
    ctx.strokeStyle = isRunner ? '#4a1f1f' : '#617753';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(joints.hip.x + 2, joints.hip.y - 4);
    ctx.lineTo(joints.shoulder.x - 1, joints.shoulder.y + 6);
    ctx.stroke();

    ctx.strokeStyle = '#181b16';
    ctx.lineWidth = ZOMBIE_BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(joints.hip.x, joints.hip.y);
    ctx.lineTo(joints.shoulder.x, joints.shoulder.y);
    ctx.stroke();
  }

  /**
   * Draw grasping undead arms.
   */
  _drawArms(ctx, joints, isAttacking, isStunned, type = 'walker') {
    ctx.lineCap = 'round';
    const skinColor = type === 'runner' ? '#788a70' : '#6b7c5e';

    // Skin on reaching arms
    ctx.strokeStyle = isStunned ? '#ffb3b3' : skinColor;
    ctx.lineWidth = ZOMBIE_BODY.OUTLINE_WIDTH + 1.5;

    // Upper arm to reaching hand
    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(joints.leftHand.x, joints.leftHand.y);
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y + 2);
    ctx.lineTo(joints.rightHand.x, joints.rightHand.y);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = '#181b16';
    ctx.lineWidth = ZOMBIE_BODY.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y);
    ctx.lineTo(joints.leftHand.x, joints.leftHand.y);
    ctx.moveTo(joints.shoulder.x, joints.shoulder.y + 2);
    ctx.lineTo(joints.rightHand.x, joints.rightHand.y);
    ctx.stroke();

    // Claws / fingers
    ctx.strokeStyle = '#22261e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(joints.leftHand.x, joints.leftHand.y);
    ctx.lineTo(joints.leftHand.x + 4, joints.leftHand.y - 2);
    ctx.moveTo(joints.rightHand.x, joints.rightHand.y);
    ctx.lineTo(joints.rightHand.x + 4, joints.rightHand.y + 1);
    ctx.stroke();
  }

  /**
   * Draw zombie head with sunken eye sockets and eerie red gaze.
   */
  _drawHead(ctx, joints, isStunned, gameTime, type = 'walker') {
    const head = joints.head;
    const skinColor = type === 'runner' ? '#788a70' : '#6b7c5e';

    // Head fill
    ctx.fillStyle = isStunned ? '#f5cccc' : skinColor;
    ctx.strokeStyle = '#181b16';
    ctx.lineWidth = ZOMBIE_BODY.OUTLINE_WIDTH;

    ctx.beginPath();
    ctx.arc(head.x, head.y, ZOMBIE_BODY.HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sunken eye socket
    ctx.fillStyle = '#1c1c18';
    ctx.beginPath();
    ctx.arc(head.x + 4, head.y - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Glowing red infected pupil
    ctx.fillStyle = type === 'runner' ? '#ff4400' : '#ff2222';
    ctx.beginPath();
    ctx.arc(head.x + 4.5, head.y - 1, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Snarl mouth
    ctx.strokeStyle = '#221919';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(head.x + 2, head.y + 5);
    ctx.lineTo(head.x + 7, head.y + 4);
    ctx.stroke();
  }

  /**
   * Draw fallen zombie corpse on the dirt.
   */
  _drawCorpse(ctx, x, y, facing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    // Blood pool
    ctx.fillStyle = 'rgba(102, 26, 26, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collapsed stickman silhouette
    ctx.strokeStyle = '#3d3830';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(12, -2);
    ctx.stroke();

    // Head on ground
    ctx.fillStyle = '#55614d';
    ctx.strokeStyle = '#181b16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(18, -3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render floating enemy health bar.
   * @private
   */
  _drawHealthBar(ctx, x, y, currentHp, maxHp) {
    const barW = 34;
    const barH = 5;
    const barX = x - barW / 2;
    const barY = y;
    const pct = Math.max(0, currentHp / maxHp);

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 18, 0.85)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    ctx.fillStyle = '#a94b43';
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.restore();
  }
}
