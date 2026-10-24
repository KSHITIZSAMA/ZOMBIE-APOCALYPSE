/**
 * RanchRenderer — Draws the Suncrest Ranch exterior structures.
 * Farmhouse, porch, chimney smoke, water well, dynamic garden beds, general store stall, and timber pile.
 */

import { PALETTE, BALANCE } from '../data/balance.js';

export class RanchRenderer {
  constructor() {
    /** House world coordinates */
    this.house = {
      x: 1300,
      width: 240,
      height: 170,
      doorX: 1400,
      doorWidth: 36,
      doorHeight: 64,
    };

    /** Water well */
    this.well = {
      x: 1680,
      width: 50,
      height: 60,
    };

    /** Garden bed */
    this.garden = {
      x: 1820,
      width: 140,
      height: 18,
    };

    /** Mailbox */
    this.mailbox = {
      x: 1180,
      width: 24,
      height: 48,
    };

    /** General Store roadside stand */
    this.shopStall = {
      x: 1060,
      width: 75,
      height: 55,
    };

    /** Timber wood pile */
    this.woodPile = {
      x: 2060,
      width: 60,
      height: 25,
    };

    /** Escape Utility Truck */
    this.truck = {
      x: 2360,
      width: 86,
      height: 42,
    };

    /** Neighbor Caleb Miller */
    this.neighbor = {
      x: 750,
      width: 36,
      name: 'Caleb Miller',
    };
  }

  /**
   * Render ranch buildings and structures.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera.js').Camera} camera
   * @param {number} daylight - [0, 1] daylight factor
   * @param {number} gameTime - Total game time for smoke/wind animations
   * @param {import('../core/FarmingSystem.js').FarmingSystem} [farmingSystem]
   * @param {string} [worldStage]
   * @param {number} [doorBarricadeLevel]
   * @param {boolean} [truckRepaired]
   */
  render(ctx, camera, daylight, gameTime, farmingSystem = null, worldStage = 'normal', doorBarricadeLevel = 0, truckRepaired = false) {
    const groundY = BALANCE.GROUND_Y;

    this._drawNeighbor(ctx, camera, groundY, gameTime);
    this._drawFarmhouse(ctx, camera, groundY, daylight, gameTime, worldStage, doorBarricadeLevel);
    this._drawWell(ctx, camera, groundY, daylight);
    this._drawGarden(ctx, camera, groundY, farmingSystem);
    this._drawShopStall(ctx, camera, groundY);
    this._drawWoodPile(ctx, camera, groundY);
    this._drawTruck(ctx, camera, groundY, truckRepaired, gameTime);
    this._drawMailbox(ctx, camera, groundY);
  }

  /**
   * Draw rustic farmhouse with porch, roof, chimney, and warm glowing window.
   */
  _drawFarmhouse(ctx, camera, groundY, daylight, gameTime, worldStage = 'normal', doorBarricadeLevel = 0) {
    const screenX = this.house.x - camera.x;
    const houseW = this.house.width;
    const houseH = this.house.height;
    const houseY = groundY - houseH;

    if (screenX + houseW < -50 || screenX > ctx.canvas.width + 50) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Chimney and Smoke
    const chimneyX = screenX + 40;
    const chimneyY = houseY - 35;
    ctx.fillStyle = '#635348';
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.fillRect(chimneyX, chimneyY, 24, 45);
    ctx.strokeRect(chimneyX, chimneyY, 24, 45);

    // Chimney smoke tufts
    ctx.fillStyle = 'rgba(230, 224, 210, 0.25)';
    for (let i = 0; i < 4; i++) {
      const smokeProgress = ((gameTime * 0.4 + i * 0.25) % 1);
      const smX = chimneyX + 12 + Math.sin(gameTime + i) * 8 + smokeProgress * 25;
      const smY = chimneyY - 8 - smokeProgress * 45;
      const smR = 5 + smokeProgress * 12;
      ctx.beginPath();
      ctx.arc(smX, smY, smR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Main Wooden House Walls
    ctx.fillStyle = '#7a6452';
    ctx.fillRect(screenX, houseY, houseW, houseH);

    // Horizontal clapboards
    ctx.strokeStyle = 'rgba(41, 41, 39, 0.45)';
    ctx.lineWidth = 1.5;
    for (let y = houseY + 12; y < groundY - 10; y += 14) {
      ctx.beginPath();
      ctx.moveTo(screenX + 3, y);
      ctx.lineTo(screenX + houseW - 3, y);
      ctx.stroke();
    }

    // Outer wall outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(screenX, houseY, houseW, houseH);

    // 3. Pitched Roof
    const roofOverhang = 22;
    const roofPeakX = screenX + houseW / 2;
    const roofPeakY = houseY - 55;

    ctx.fillStyle = '#4c423d';
    ctx.beginPath();
    ctx.moveTo(screenX - roofOverhang, houseY + 5);
    ctx.lineTo(roofPeakX, roofPeakY);
    ctx.lineTo(screenX + houseW + roofOverhang, houseY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Attic vent
    ctx.fillStyle = '#3a3430';
    ctx.beginPath();
    ctx.arc(roofPeakX, houseY - 18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Porch
    const porchX = screenX + 85;
    const porchW = 145;
    const porchH = 75;
    const porchY = groundY - porchH;

    ctx.fillStyle = '#5c483a';
    ctx.fillRect(porchX, groundY - 10, porchW, 10);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(porchX, groundY - 10, porchW, 10);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3c2e26';
    ctx.beginPath();
    ctx.moveTo(porchX + 10, porchY);
    ctx.lineTo(porchX + 10, groundY - 10);
    ctx.moveTo(porchX + porchW - 10, porchY);
    ctx.lineTo(porchX + porchW - 10, groundY - 10);
    ctx.stroke();

    ctx.fillStyle = '#463c37';
    ctx.fillRect(porchX - 5, porchY - 6, porchW + 10, 8);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.strokeRect(porchX - 5, porchY - 6, porchW + 10, 8);

    // 5. Door
    const doorScreenX = this.house.doorX - camera.x;
    const doorW = this.house.doorWidth;
    const doorH = this.house.doorHeight;
    const doorY = groundY - doorH;

    ctx.fillStyle = '#4a3728';
    ctx.fillRect(doorScreenX, doorY, doorW, doorH);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(doorScreenX, doorY, doorW, doorH);

    ctx.fillStyle = PALETTE.INTERIOR_LIGHT;
    ctx.beginPath();
    ctx.arc(doorScreenX + doorW - 7, doorY + doorH * 0.55, 3, 0, Math.PI * 2);
    ctx.fill();

    // Door Barricades (Visible wooden fortification planks)
    if (doorBarricadeLevel > 0) {
      ctx.save();
      // Level 1: Diagonal timber beam
      if (doorBarricadeLevel >= 1) {
        ctx.strokeStyle = '#855b38';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(doorScreenX - 4, doorY + doorH - 6);
        ctx.lineTo(doorScreenX + doorW + 4, doorY + 6);
        ctx.stroke();

        ctx.strokeStyle = PALETTE.OUTLINE;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Level 2: Second cross diagonal beam forming an 'X'
      if (doorBarricadeLevel >= 2) {
        ctx.strokeStyle = '#855b38';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(doorScreenX - 4, doorY + 6);
        ctx.lineTo(doorScreenX + doorW + 4, doorY + doorH - 6);
        ctx.stroke();

        ctx.strokeStyle = PALETTE.OUTLINE;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Level 3: Heavy horizontal reinforcement crossbeams with iron rivets
      if (doorBarricadeLevel >= 3) {
        for (let b = 1; b <= 3; b++) {
          const beamY = doorY + (doorH / 4) * b - 4;
          ctx.fillStyle = '#6b4528';
          ctx.fillRect(doorScreenX - 5, beamY, doorW + 10, 8);
          ctx.strokeStyle = PALETTE.OUTLINE;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(doorScreenX - 5, beamY, doorW + 10, 8);

          // Iron nails
          ctx.fillStyle = '#1c1c18';
          ctx.beginPath();
          ctx.arc(doorScreenX - 1, beamY + 4, 1.5, 0, Math.PI * 2);
          ctx.arc(doorScreenX + doorW + 1, beamY + 4, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Blood stains around porch during outbreak
    if (worldStage === 'outbreak') {
      ctx.fillStyle = 'rgba(95, 20, 20, 0.6)';
      ctx.beginPath();
      ctx.ellipse(porchX + 30, groundY - 2, 16, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(doorScreenX + 8, groundY - 2, 12, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Window
    const winScreenX = screenX + 160;
    const winY = groundY - 120;
    const winW = 38;
    const winH = 42;

    const windowWarmth = 0.55 + (1 - daylight) * 0.45;
    ctx.fillStyle = `rgba(230, 173, 97, ${windowWarmth})`;
    ctx.fillRect(winScreenX, winY, winW, winH);

    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(winScreenX, winY, winW, winH);

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(winScreenX + winW / 2, winY);
    ctx.lineTo(winScreenX + winW / 2, winY + winH);
    ctx.moveTo(winScreenX, winY + winH / 2);
    ctx.lineTo(winScreenX + winW, winY + winH / 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw stone water well.
   */
  _drawWell(ctx, camera, groundY, daylight) {
    const screenX = this.well.x - camera.x;
    const w = this.well.width;
    const h = this.well.height;

    if (screenX + w < -30 || screenX > ctx.canvas.width + 30) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#6b7072';
    ctx.fillRect(screenX, groundY - 25, w, 25);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, groundY - 25, w, 25);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#4a3728';
    ctx.beginPath();
    ctx.moveTo(screenX + 5, groundY - 25);
    ctx.lineTo(screenX + 5, groundY - h);
    ctx.moveTo(screenX + w - 5, groundY - 25);
    ctx.lineTo(screenX + w - 5, groundY - h);
    ctx.stroke();

    ctx.fillStyle = '#5c483a';
    ctx.beginPath();
    ctx.moveTo(screenX - 8, groundY - h + 6);
    ctx.lineTo(screenX + w / 2, groundY - h - 14);
    ctx.lineTo(screenX + w + 8, groundY - h + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#c4b59b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenX + w / 2, groundY - h);
    ctx.lineTo(screenX + w / 2, groundY - 32);
    ctx.stroke();

    ctx.fillStyle = '#4c392c';
    ctx.fillRect(screenX + w / 2 - 5, groundY - 32, 10, 10);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX + w / 2 - 5, groundY - 32, 10, 10);

    ctx.restore();
  }

  /**
   * Draw garden soil plot with dynamic crops (sprouts, mature produce, moist soil).
   */
  _drawGarden(ctx, camera, groundY, farmingSystem = null) {
    const screenX = this.garden.x - camera.x;
    const w = this.garden.width;

    if (screenX + w < -30 || screenX > ctx.canvas.width + 30) return;

    ctx.save();
    const plot = farmingSystem?.getPlot(0);
    const isWatered = plot?.isWatered ?? false;
    const state = plot?.state ?? 'tilled';

    // Soil color: darker if watered
    ctx.fillStyle = isWatered ? '#362519' : '#4a3525';
    ctx.fillRect(screenX, groundY - 6, w, 14);

    // Soil furrow lines
    ctx.strokeStyle = isWatered ? '#24170d' : '#322318';
    ctx.lineWidth = 1.5;
    for (let x = screenX + 8; x < screenX + w - 6; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, groundY - 5);
      ctx.lineTo(x + 5, groundY + 4);
      ctx.stroke();
    }

    // Border stakes
    ctx.fillStyle = '#6b5443';
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.fillRect(screenX - 3, groundY - 14, 6, 16);
    ctx.strokeRect(screenX - 3, groundY - 14, 6, 16);
    ctx.fillRect(screenX + w - 3, groundY - 14, 6, 16);
    ctx.strokeRect(screenX + w - 3, groundY - 14, 6, 16);

    // Visible growing crops or mature produce
    if (state === 'growing' || state === 'mature') {
      const isMature = state === 'mature';
      const progress = isMature ? 1.0 : Math.min(1.0, plot.growthHours / plot.requiredHours);
      const plantH = 6 + progress * 22;

      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      for (let x = screenX + 16; x < screenX + w - 10; x += 22) {
        // Stem
        ctx.strokeStyle = isMature ? '#8aa565' : '#687e50';
        ctx.beginPath();
        ctx.moveTo(x, groundY - 4);
        ctx.lineTo(x, groundY - 4 - plantH);
        ctx.stroke();

        // Leaves
        ctx.beginPath();
        ctx.moveTo(x, groundY - 4 - plantH * 0.6);
        ctx.lineTo(x - 5, groundY - 4 - plantH * 0.7);
        ctx.moveTo(x, groundY - 4 - plantH * 0.4);
        ctx.lineTo(x + 5, groundY - 4 - plantH * 0.5);
        ctx.stroke();

        // Mature produce head (golden corn or red tomato)
        if (isMature) {
          if (plot.cropId === 'corn') {
            ctx.fillStyle = '#E6C65A';
            ctx.fillRect(x - 3, groundY - 4 - plantH - 6, 6, 8);
            ctx.strokeStyle = PALETTE.OUTLINE;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 3, groundY - 4 - plantH - 6, 6, 8);
          } else {
            // Tomato
            ctx.fillStyle = '#c7493a';
            ctx.beginPath();
            ctx.arc(x, groundY - 4 - plantH - 2, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = PALETTE.OUTLINE;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Draw roadside General Store wooden merchant stand.
   */
  _drawShopStall(ctx, camera, groundY) {
    const screenX = this.shopStall.x - camera.x;
    const w = this.shopStall.width;
    const h = this.shopStall.height;

    if (screenX + w < -30 || screenX > ctx.canvas.width + 30) return;

    ctx.save();
    // Wooden counter
    ctx.fillStyle = '#5c483b';
    ctx.fillRect(screenX, groundY - 24, w, 24);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, groundY - 24, w, 24);

    // Awning posts
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#3a2d24';
    ctx.beginPath();
    ctx.moveTo(screenX + 4, groundY - 24);
    ctx.lineTo(screenX + 4, groundY - h);
    ctx.moveTo(screenX + w - 4, groundY - 24);
    ctx.lineTo(screenX + w - 4, groundY - h);
    ctx.stroke();

    // Canvas striped awning
    ctx.fillStyle = '#8a5348';
    ctx.fillRect(screenX - 6, groundY - h - 6, w + 12, 10);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX - 6, groundY - h - 6, w + 12, 10);

    // Store sign
    ctx.fillStyle = PALETTE.PAPER;
    ctx.fillRect(screenX + w / 2 - 20, groundY - h + 6, 40, 12);
    ctx.strokeRect(screenX + w / 2 - 20, groundY - h + 6, 40, 12);
    ctx.fillStyle = PALETTE.OUTLINE;
    ctx.font = '700 8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STORE', screenX + w / 2, groundY - h + 15);

    ctx.restore();
  }

  /**
   * Draw wood pile near ranch edge.
   */
  _drawWoodPile(ctx, camera, groundY) {
    const screenX = this.woodPile.x - camera.x;
    const w = this.woodPile.width;

    if (screenX + w < -20 || screenX > ctx.canvas.width + 20) return;

    ctx.save();
    ctx.fillStyle = '#7a5a3a';
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.5;

    // Stacked logs
    for (let r = 0; r < 3; r++) {
      const logsInRow = 4 - r;
      const rowY = groundY - 5 - r * 7;
      for (let c = 0; c < logsInRow; c++) {
        const logX = screenX + c * 12 + r * 6;
        ctx.fillRect(logX, rowY, 22, 6);
        ctx.strokeRect(logX, rowY, 22, 6);
      }
    }

    ctx.restore();
  }

  /**
   * Draw old ranch utility pickup truck (evacuation escape route).
   */
  _drawTruck(ctx, camera, groundY, isRepaired = false, gameTime = 0) {
    const screenX = this.truck.x - camera.x;
    const w = this.truck.width;
    const h = this.truck.height;

    if (screenX + w < -40 || screenX > ctx.canvas.width + 40) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Wheels
    const rearWheelX = screenX + 18;
    const frontWheelX = screenX + w - 18;
    const wheelY = groundY - 7;
    const wheelR = 8;

    ctx.fillStyle = '#222220';
    ctx.beginPath();
    ctx.arc(rearWheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.arc(frontWheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7a858d';
    ctx.beginPath();
    ctx.arc(rearWheelX, wheelY, 3, 0, Math.PI * 2);
    ctx.arc(frontWheelX, wheelY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Truck Bed (Cargo area)
    ctx.fillStyle = '#3a4a3e';
    ctx.fillRect(screenX + 4, groundY - 26, 42, 18);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX + 4, groundY - 26, 42, 18);

    // Wooden bed rack stakes
    ctx.strokeStyle = '#6e543e';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const stakeX = screenX + 8 + i * 11;
      ctx.beginPath();
      ctx.moveTo(stakeX, groundY - 26);
      ctx.lineTo(stakeX, groundY - 36);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + 6, groundY - 33);
    ctx.lineTo(screenX + 44, groundY - 33);
    ctx.stroke();

    // Cabin & Hood
    ctx.fillStyle = '#425547';
    ctx.beginPath();
    ctx.moveTo(screenX + 42, groundY - 8);
    ctx.lineTo(screenX + 42, groundY - 38);
    ctx.lineTo(screenX + 64, groundY - 38);
    ctx.lineTo(screenX + 74, groundY - 24);
    ctx.lineTo(screenX + w - 2, groundY - 24);
    ctx.lineTo(screenX + w - 2, groundY - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Windshield
    ctx.fillStyle = 'rgba(180, 205, 215, 0.7)';
    ctx.beginPath();
    ctx.moveTo(screenX + 54, groundY - 36);
    ctx.lineTo(screenX + 63, groundY - 36);
    ctx.lineTo(screenX + 71, groundY - 25);
    ctx.lineTo(screenX + 54, groundY - 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Headlight & glow
    const lightX = screenX + w - 2;
    const lightY = groundY - 20;
    if (isRepaired) {
      // Lit headlight
      ctx.fillStyle = '#fce295';
      ctx.beginPath();
      ctx.arc(lightX, lightY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Light beam
      const beamGrad = ctx.createLinearGradient(lightX, lightY, lightX + 80, lightY);
      beamGrad.addColorStop(0, 'rgba(252, 226, 149, 0.45)');
      beamGrad.addColorStop(1, 'rgba(252, 226, 149, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(lightX, lightY - 2);
      ctx.lineTo(lightX + 80, lightY - 14);
      ctx.lineTo(lightX + 80, lightY + 14);
      ctx.lineTo(lightX, lightY + 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#a8b0b8';
      ctx.beginPath();
      ctx.arc(lightX, lightY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front Bumper
    ctx.fillStyle = '#8f9ca5';
    ctx.fillRect(screenX + w - 4, groundY - 12, 6, 5);

    ctx.restore();
  }

  /**
   * Draw roadside mailbox.
   */
  _drawMailbox(ctx, camera, groundY) {
    const screenX = this.mailbox.x - camera.x;
    if (screenX < -20 || screenX > ctx.canvas.width + 20) return;

    ctx.save();
    ctx.strokeStyle = '#5a4635';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(screenX, groundY);
    ctx.lineTo(screenX, groundY - 35);
    ctx.stroke();

    ctx.fillStyle = '#7a858d';
    ctx.fillRect(screenX - 10, groundY - 45, 20, 12);
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenX - 10, groundY - 45, 20, 12);

    ctx.fillStyle = PALETTE.DANGER;
    ctx.fillRect(screenX + 10, groundY - 46, 3, 7);
    ctx.fillRect(screenX + 10, groundY - 46, 6, 4);

    ctx.restore();
  }

  /**
   * Draw rural neighbor Caleb Miller standing near the fence line.
   */
  _drawNeighbor(ctx, camera, groundY, gameTime) {
    const screenX = this.neighbor.x - camera.x;
    if (screenX < -30 || screenX > ctx.canvas.width + 30) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Neighbor fence post & gate
    ctx.strokeStyle = '#5c483a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(screenX - 15, groundY);
    ctx.lineTo(screenX - 15, groundY - 35);
    ctx.stroke();

    // Stickman Caleb
    const feetY = groundY;
    const hipY = feetY - 22;
    const shoulderY = feetY - 42;
    const headY = feetY - 55;

    // Legs (dark work pants)
    ctx.strokeStyle = '#2d3339';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(screenX - 3, hipY);
    ctx.lineTo(screenX - 4, feetY);
    ctx.moveTo(screenX + 3, hipY);
    ctx.lineTo(screenX + 4, feetY);
    ctx.stroke();

    // Torso (plaid/red work shirt)
    ctx.strokeStyle = '#8a4b43';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(screenX, hipY);
    ctx.lineTo(screenX, shoulderY);
    ctx.stroke();

    // Torso outline
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, hipY);
    ctx.lineTo(screenX, shoulderY);
    ctx.stroke();

    // Arms (hand on hip, resting on fence)
    ctx.beginPath();
    ctx.moveTo(screenX, shoulderY);
    ctx.lineTo(screenX - 12, shoulderY + 12);
    ctx.lineTo(screenX - 15, groundY - 35);
    ctx.moveTo(screenX, shoulderY);
    ctx.lineTo(screenX + 10, shoulderY + 10);
    ctx.lineTo(screenX + 6, hipY);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#E6CBA8';
    ctx.beginPath();
    ctx.arc(screenX, headY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Grey hair cap
    ctx.fillStyle = '#8A8D91';
    ctx.beginPath();
    ctx.arc(screenX, headY, 10, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = PALETTE.OUTLINE;
    ctx.beginPath();
    ctx.arc(screenX + 2, headY - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Name badge overhead
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(26, 30, 36, 0.8)';
    const textW = ctx.measureText('Caleb').width;
    ctx.fillRect(screenX - textW / 2 - 4, headY - 24, textW + 8, 14);
    ctx.fillStyle = PALETTE.PAPER;
    ctx.textAlign = 'center';
    ctx.fillText('Caleb', screenX, headY - 13);

    ctx.restore();
  }
}
