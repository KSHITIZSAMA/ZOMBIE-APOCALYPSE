/**
 * InteriorRenderer — Draws the Farmhouse Interior scene.
 * Cozy wooden walls, glowing brick fireplace, country bed, table, window, and exit door.
 */

import { PALETTE } from '../data/balance.js';

export class InteriorRenderer {
  constructor() {
    this.width = 900;
    this.groundY = 480;

    /** Exit door position inside the house */
    this.door = {
      x: 100,
      width: 38,
      height: 70,
    };

    /** Fireplace */
    this.fireplace = {
      x: 420,
      width: 80,
      height: 90,
    };

    /** Bed */
    this.bed = {
      x: 720,
      width: 110,
      height: 48,
    };

    /** Table & chair */
    this.table = {
      x: 240,
      width: 85,
      height: 42,
    };

    /** Window */
    this.window = {
      x: 580,
      y: 290,
      width: 60,
      height: 65,
    };
  }

  /**
   * Render the farmhouse interior.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera.js').Camera} camera
   * @param {import('../core/ClockSystem.js').ClockSystem} clock
   * @param {number} gameTime
   */
  render(ctx, camera, clock, gameTime) {
    const { width: screenW, height: screenH } = ctx.canvas;
    const daylight = clock.getDaylightFactor();
    const groundY = this.groundY;

    ctx.save();

    // 1. Warm interior background
    ctx.fillStyle = '#2b231d';
    ctx.fillRect(0, 0, screenW, screenH);

    // 2. Room Back Wall (within interior bounds)
    const wallLeft = 0 - camera.x;
    const wallRight = this.width - camera.x;
    const wallTop = groundY - 260;
    const wallHeight = 260;

    // Interior wallpaper fill
    ctx.fillStyle = '#42372f';
    ctx.fillRect(wallLeft, wallTop, this.width, wallHeight);

    // Subtle vertical wooden panel stripes
    ctx.strokeStyle = 'rgba(30, 24, 20, 0.4)';
    ctx.lineWidth = 1.5;
    for (let x = wallLeft + 20; x < wallRight; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, wallTop);
      ctx.lineTo(x, groundY);
      ctx.stroke();
    }

    // Ceiling beams
    ctx.fillStyle = '#2f241d';
    ctx.fillRect(wallLeft, wallTop - 12, this.width, 14);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(wallLeft, wallTop - 12, this.width, 14);

    // Baseboard moulding
    ctx.fillStyle = '#32261e';
    ctx.fillRect(wallLeft, groundY - 14, this.width, 14);
    ctx.strokeRect(wallLeft, groundY - 14, this.width, 14);

    // 3. Wooden Floor
    ctx.fillStyle = '#533f2f';
    ctx.fillRect(wallLeft, groundY, this.width, screenH - groundY);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(wallLeft, groundY);
    ctx.lineTo(wallRight, groundY);
    ctx.stroke();

    // Floorboard planks
    ctx.strokeStyle = 'rgba(30, 24, 20, 0.5)';
    ctx.lineWidth = 1.5;
    for (let y = groundY + 16; y < screenH; y += 18) {
      ctx.beginPath();
      ctx.moveTo(wallLeft, y);
      ctx.lineTo(wallRight, y);
      ctx.stroke();
    }

    // Left and Right Wall Limits (Ink Borders)
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wallLeft, wallTop - 12);
    ctx.lineTo(wallLeft, screenH);
    ctx.moveTo(wallRight, wallTop - 12);
    ctx.lineTo(wallRight, screenH);
    ctx.stroke();

    // 4. Window showing outdoor sky
    this._drawWindow(ctx, camera, daylight);

    // 5. Fireplace
    this._drawFireplace(ctx, camera, groundY, gameTime);

    // 6. Bed
    this._drawBed(ctx, camera, groundY);

    // 7. Kitchen Table and Chair
    this._drawTable(ctx, camera, groundY, gameTime);

    // 8. Exit Door
    this._drawDoor(ctx, camera, groundY);

    // 9. Warm Interior Atmospheric Lighting Vignette
    this._drawAmbientLighting(ctx, camera, screenW, screenH, daylight);

    ctx.restore();
  }

  /**
   * Draw outdoor view window.
   */
  _drawWindow(ctx, camera, daylight) {
    const wx = this.window.x - camera.x;
    const wy = this.window.y;
    const w = this.window.width;
    const h = this.window.height;

    // Sky outside
    const skyColor = daylight > 0.5 ? '#6a88a5' : '#232b38';
    ctx.fillStyle = skyColor;
    ctx.fillRect(wx, wy, w, h);

    // Window frame
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(wx, wy, w, h);

    // Window grid
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wx + w / 2, wy);
    ctx.lineTo(wx + w / 2, wy + h);
    ctx.moveTo(wx, wy + h / 2);
    ctx.lineTo(wx + w, wy + h / 2);
    ctx.stroke();

    // Warm curtains
    ctx.fillStyle = '#7a3f3b';
    ctx.fillRect(wx - 8, wy - 4, 10, h + 8);
    ctx.fillRect(wx + w - 2, wy - 4, 10, h + 8);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.strokeRect(wx - 8, wy - 4, 10, h + 8);
    ctx.strokeRect(wx + w - 2, wy - 4, 10, h + 8);
  }

  /**
   * Draw stone/brick fireplace with flickering embers.
   */
  _drawFireplace(ctx, camera, groundY, gameTime) {
    const fx = this.fireplace.x - camera.x;
    const fy = groundY - this.fireplace.height;
    const fw = this.fireplace.width;
    const fh = this.fireplace.height;

    // Brick structure
    ctx.fillStyle = '#5c483d';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(fx, fy, fw, fh);

    // Mantle piece
    ctx.fillStyle = '#3a2d24';
    ctx.fillRect(fx - 6, fy - 8, fw + 12, 10);
    ctx.strokeRect(fx - 6, fy - 8, fw + 12, 10);

    // Firebox opening
    const boxW = 44;
    const boxH = 46;
    const boxX = fx + (fw - boxW) / 2;
    const boxY = groundY - boxH;

    ctx.fillStyle = '#1c1512';
    ctx.beginPath();
    ctx.moveTo(boxX, groundY);
    ctx.lineTo(boxX, boxY + 12);
    ctx.quadraticCurveTo(boxX + boxW / 2, boxY - 4, boxX + boxW, boxY + 12);
    ctx.lineTo(boxX + boxW, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.stroke();

    // Fire flame / glow
    const flicker = Math.sin(gameTime * 7) * 4 + Math.cos(gameTime * 11) * 3;
    const fireGrad = ctx.createRadialGradient(
      boxX + boxW / 2,
      groundY - 14,
      4,
      boxX + boxW / 2,
      groundY - 14,
      26 + flicker
    );
    fireGrad.addColorStop(0, '#f2d480');
    fireGrad.addColorStop(0.4, '#e0833a');
    fireGrad.addColorStop(0.8, 'rgba(180, 50, 40, 0.4)');
    fireGrad.addColorStop(1, 'rgba(200, 100, 30, 0)');

    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(boxX + boxW / 2, groundY - 14, 26 + flicker, 0, Math.PI * 2);
    ctx.fill();

    // Fire logs
    ctx.strokeStyle = '#2b1d14';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(boxX + 8, groundY - 4);
    ctx.lineTo(boxX + boxW - 8, groundY - 10);
    ctx.moveTo(boxX + 10, groundY - 10);
    ctx.lineTo(boxX + boxW - 10, groundY - 4);
    ctx.stroke();
  }

  /**
   * Draw wooden bed.
   */
  _drawBed(ctx, camera, groundY) {
    const bx = this.bed.x - camera.x;
    const bw = this.bed.width;
    const bh = this.bed.height;
    const by = groundY - bh;

    // Wooden bed frame
    ctx.fillStyle = '#4a382c';
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;

    // Headboard (right)
    ctx.fillRect(bx + bw - 10, by - 18, 10, bh + 18);
    ctx.strokeRect(bx + bw - 10, by - 18, 10, bh + 18);

    // Footboard (left)
    ctx.fillRect(bx, by, 8, bh);
    ctx.strokeRect(bx, by, 8, bh);

    // Mattress & Blanket
    ctx.fillStyle = '#617482'; // Slate blue blanket
    ctx.fillRect(bx + 8, by + 12, bw - 18, bh - 12);
    ctx.strokeRect(bx + 8, by + 12, bw - 18, bh - 12);

    // Folded quilt sheet
    ctx.fillStyle = PALETTE.PAPER;
    ctx.fillRect(bx + bw - 38, by + 10, 20, 14);
    ctx.strokeRect(bx + bw - 38, by + 10, 20, 14);

    // Pillow
    ctx.fillStyle = '#ded7c8';
    ctx.fillRect(bx + bw - 32, by + 2, 22, 12);
    ctx.strokeRect(bx + bw - 32, by + 2, 22, 12);
  }

  /**
   * Draw table and candle.
   */
  _drawTable(ctx, camera, groundY, gameTime) {
    const tx = this.table.x - camera.x;
    const tw = this.table.width;
    const th = this.table.height;
    const ty = groundY - th;

    // Wooden table top
    ctx.fillStyle = '#5c4636';
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.fillRect(tx, ty, tw, 8);
    ctx.strokeRect(tx, ty, tw, 8);

    // Table legs
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#423226';
    ctx.beginPath();
    ctx.moveTo(tx + 6, ty + 8);
    ctx.lineTo(tx + 6, groundY);
    ctx.moveTo(tx + tw - 6, ty + 8);
    ctx.lineTo(tx + tw - 6, groundY);
    ctx.stroke();

    // Candle on table
    const cx = tx + tw / 2;
    const cy = ty - 12;
    ctx.fillStyle = PALETTE.PAPER;
    ctx.fillRect(cx - 2, cy, 4, 12);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 2, cy, 4, 12);

    // Candle flame
    const flicker = Math.sin(gameTime * 8) * 1.5;
    ctx.fillStyle = PALETTE.INTERIOR_LIGHT;
    ctx.beginPath();
    ctx.arc(cx, cy - 3 + flicker * 0.3, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw interior exit door.
   */
  _drawDoor(ctx, camera, groundY) {
    const dx = this.door.x - camera.x;
    const dw = this.door.width;
    const dh = this.door.height;
    const dy = groundY - dh;

    // Door frame
    ctx.fillStyle = '#3a2d24';
    ctx.fillRect(dx - 4, dy - 4, dw + 8, dh + 4);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(dx - 4, dy - 4, dw + 8, dh + 4);

    // Wooden door
    ctx.fillStyle = '#4d3b2e';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeRect(dx, dy, dw, dh);

    // Door panels
    ctx.strokeStyle = 'rgba(30, 24, 20, 0.6)';
    ctx.strokeRect(dx + 4, dy + 6, dw - 8, 24);
    ctx.strokeRect(dx + 4, dy + 34, dw - 8, 28);

    // Brass doorknob
    ctx.fillStyle = PALETTE.INTERIOR_LIGHT;
    ctx.beginPath();
    ctx.arc(dx + dw - 6, dy + dh * 0.55, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw ambient lighting warm overlay.
   */
  _drawAmbientLighting(ctx, camera, screenW, screenH, daylight) {
    // Warm radial lighting centered around the fireplace and candle
    const fx = this.fireplace.x + this.fireplace.width / 2 - camera.x;
    const fy = this.groundY - 30;

    const radial = ctx.createRadialGradient(fx, fy, 40, fx, fy, 450);
    radial.addColorStop(0, 'rgba(230, 173, 97, 0.22)');
    radial.addColorStop(0.6, 'rgba(230, 173, 97, 0.08)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0.35)');

    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, screenW, screenH);
  }
}
