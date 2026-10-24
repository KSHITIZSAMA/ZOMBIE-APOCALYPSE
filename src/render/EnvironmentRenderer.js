/**
 * EnvironmentRenderer — Draws the atmospheric hand-drawn world.
 * Sky, clouds, ground, trees, grass, fences, and atmospheric effects.
 */

import { PALETTE, BALANCE } from '../data/balance.js';

export class EnvironmentRenderer {
  constructor() {
    /** @type {Array<{x: number, y: number, w: number, speed: number, opacity: number}>} */
    this._clouds = [];

    /** @type {Array<{x: number, type: number, height: number, seed: number}>} */
    this._trees = [];

    /** @type {Array<{x: number, height: number, lean: number}>} */
    this._grassTufts = [];

    /** @type {Array<{x: number, height: number, spacing: number}>} */
    this._fences = [];

    this._initialized = false;
  }

  /**
   * Initialize procedural elements using seeded RNG.
   * @param {import('../utils/rng.js').createRNG} rng
   */
  init(rng) {
    if (this._initialized) return;

    // Generate clouds
    for (let i = 0; i < 8; i++) {
      this._clouds.push({
        x: rng.float() * BALANCE.WORLD_WIDTH,
        y: 30 + rng.float() * 100,
        w: 80 + rng.float() * 160,
        speed: 2 + rng.float() * 5,
        opacity: 0.15 + rng.float() * 0.2,
      });
    }

    // Generate trees (background silhouettes and foreground)
    for (let x = 50; x < BALANCE.WORLD_WIDTH; x += 80 + Math.floor(rng.float() * 120)) {
      this._trees.push({
        x,
        type: Math.floor(rng.float() * 3), // 0=pine, 1=deciduous, 2=dead
        height: 60 + rng.float() * 80,
        seed: rng.float() * 1000,
      });
    }

    // Generate grass tufts
    for (let x = 10; x < BALANCE.WORLD_WIDTH; x += 15 + Math.floor(rng.float() * 25)) {
      this._grassTufts.push({
        x,
        height: 5 + rng.float() * 12,
        lean: (rng.float() - 0.5) * 0.3,
      });
    }

    // Generate fence sections
    const fenceStartX = BALANCE.WORLD_WIDTH * 0.3;
    const fenceEndX = BALANCE.WORLD_WIDTH * 0.7;
    for (let x = fenceStartX; x < fenceEndX; x += 40) {
      this._fences.push({
        x,
        height: 30 + rng.float() * 8,
        spacing: 38 + rng.float() * 4,
      });
    }

    this._initialized = true;
  }

  /**
   * Render the full environment.
   * @param {import('../core/Camera.js').Camera} camera
   * @param {import('../core/ClockSystem.js').ClockSystem} clock
   * @param {number} gameTime - Total game time in seconds (for animations).
   * @param {string} [worldStage] - 'normal' | 'early_warning' | 'escalating_crisis' | 'outbreak'
   */
  render(ctx, camera, clock, gameTime, worldStage = 'normal') {
    const { width, height } = ctx.canvas;
    const daylight = clock.getDaylightFactor();

    this._drawSky(ctx, width, height, daylight, clock, worldStage);
    if (worldStage === 'outbreak') {
      this._drawOutbreakSmoke(ctx, camera, width, height, gameTime);
    }
    this._drawClouds(ctx, camera, width, daylight, gameTime);
    this._drawDistantHills(ctx, camera, width, height, daylight);
    this._drawBackgroundTrees(ctx, camera, daylight);
    this._drawGround(ctx, camera, width, height, daylight);
    this._drawFences(ctx, camera, daylight, worldStage);
    this._drawGrassTufts(ctx, camera, daylight);
    this._drawFog(ctx, width, height, daylight, clock, worldStage);
  }

  /**
   * Draw the sky gradient with time-of-day transitions and outbreak color shifts.
   */
  _drawSky(ctx, w, h, daylight, clock, worldStage = 'normal') {
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.7);

    if (worldStage === 'outbreak') {
      // Apocalyptic blood-dusk sky palette
      const topR = Math.round(this._lerp(0x1a, 0x43, daylight));
      const topG = Math.round(this._lerp(0x11, 0x1b, daylight));
      const topB = Math.round(this._lerp(0x15, 0x1f, daylight));

      const botR = Math.round(this._lerp(0x35, 0x5a, daylight));
      const botG = Math.round(this._lerp(0x18, 0x24, daylight));
      const botB = Math.round(this._lerp(0x1c, 0x28, daylight));

      grad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
      grad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
    } else {
      // Standard tranquil sky
      const topR = this._lerp(0x1a, 0x5a, daylight);
      const topG = this._lerp(0x22, 0x7a, daylight);
      const topB = this._lerp(0x30, 0x9a, daylight);

      const botR = this._lerp(0x39, 0x8f, daylight);
      const botG = this._lerp(0x46, 0xa5, daylight);
      const botB = this._lerp(0x53, 0xb8, daylight);

      grad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
      grad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Sun or moon
    const hour = clock.hour + clock.minute / 60;
    if (daylight > 0.1) {
      // Sun position
      const sunProgress = (hour - 6) / 14;
      const sunX = w * 0.1 + sunProgress * w * 0.8;
      const sunY = h * 0.15 + Math.sin(sunProgress * Math.PI) * -h * 0.1;
      this._drawSun(ctx, sunX, sunY, daylight, worldStage);
    } else {
      // Moon
      const moonX = w * 0.75;
      const moonY = h * 0.12;
      this._drawMoon(ctx, moonX, moonY);
    }

    // Stars at night
    if (daylight < 0.3) {
      this._drawStars(ctx, w, h, 1 - daylight / 0.3);
    }
  }

  /**
   * Draw distant ominous billowing smoke columns during the apocalypse.
   */
  _drawOutbreakSmoke(ctx, camera, width, height, gameTime) {
    const smokeSources = [600, 1650, 2450];
    ctx.save();

    for (let s = 0; s < smokeSources.length; s++) {
      const worldX = smokeSources[s];
      const screenX = worldX - camera.x * 0.4; // Parallax
      if (screenX < -100 || screenX > width + 100) continue;

      const baseGround = BALANCE.GROUND_Y - 40;
      for (let p = 0; p < 8; p++) {
        const progress = ((gameTime * 0.25 + p * 0.12 + s * 0.3) % 1);
        const wave = Math.sin(gameTime * 1.5 + p + s) * (15 * progress);
        const smX = screenX + wave + (progress * 30);
        const smY = baseGround - (progress * 260);
        const smRadius = 12 + progress * 32;
        const alpha = Math.max(0, 0.45 * (1 - progress));

        ctx.fillStyle = `rgba(32, 26, 26, ${alpha})`;
        ctx.beginPath();
        ctx.arc(smX, smY, smRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawSun(ctx, x, y, daylight) {
    const radius = 20;
    const glowRadius = 60;

    // Glow
    const glow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, glowRadius);
    glow.addColorStop(0, `rgba(230, 212, 168, ${0.3 * daylight})`);
    glow.addColorStop(1, 'rgba(230, 212, 168, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Sun disc
    ctx.fillStyle = PALETTE.SUN;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMoon(ctx, x, y) {
    const radius = 14;

    // Glow
    const glow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, 50);
    glow.addColorStop(0, 'rgba(200, 204, 208, 0.15)');
    glow.addColorStop(1, 'rgba(200, 204, 208, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();

    // Moon disc (crescent effect)
    ctx.fillStyle = PALETTE.MOON;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Shadow to create crescent
    ctx.fillStyle = this._lerpColor(PALETTE.SKY_NIGHT_TOP, PALETTE.MOON, 0.3);
    ctx.beginPath();
    ctx.arc(x + 5, y - 2, radius * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawStars(ctx, w, h, intensity) {
    // Deterministic star positions
    ctx.fillStyle = `rgba(230, 224, 210, ${intensity * 0.6})`;
    for (let i = 0; i < 40; i++) {
      // Use a hash-like function for deterministic positions
      const px = ((i * 7919 + 104729) % 10000) / 10000;
      const py = ((i * 6271 + 32479) % 10000) / 10000;
      const size = ((i * 3571) % 3) + 1;
      const x = px * w;
      const y = py * h * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw drifting clouds.
   */
  _drawClouds(ctx, camera, w, daylight, gameTime) {
    const cloudAlpha = Math.max(0.05, daylight * 0.3);

    for (const cloud of this._clouds) {
      // Parallax: clouds move slower than camera
      const parallax = 0.3;
      let screenX = cloud.x - camera.x * parallax + gameTime * cloud.speed;
      // Wrap clouds
      screenX = ((screenX % (w + cloud.w * 2)) + w + cloud.w * 2) % (w + cloud.w * 2) - cloud.w;

      ctx.save();
      ctx.globalAlpha = cloud.opacity * cloudAlpha;
      this._drawCloud(ctx, screenX, cloud.y, cloud.w);
      ctx.restore();
    }
  }

  _drawCloud(ctx, x, y, w) {
    ctx.fillStyle = PALETTE.PAPER;
    const h = w * 0.3;

    // Sketchy cloud shape using multiple overlapping ellipses
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - w * 0.25, y + h * 0.1, w * 0.3, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.05, w * 0.35, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw distant rolling hills with parallax.
   */
  _drawDistantHills(ctx, camera, w, h, daylight) {
    const groundY = BALANCE.GROUND_Y;
    const parallax = 0.2;
    const offset = -camera.x * parallax;

    // Hill color blends with sky
    const hillAlpha = 0.15 + daylight * 0.2;
    ctx.fillStyle = `rgba(${this._lerp(40, 80, daylight)}, ${this._lerp(55, 100, daylight)}, ${this._lerp(65, 80, daylight)}, ${hillAlpha})`;

    // Distant hills (background)
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 8) {
      const worldX = x - offset;
      const hillY = groundY - 40 - Math.sin(worldX * 0.003) * 30 - Math.sin(worldX * 0.007 + 2) * 20;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    // Second layer of hills (closer)
    const parallax2 = 0.4;
    const offset2 = -camera.x * parallax2;
    ctx.fillStyle = `rgba(${this._lerp(50, 90, daylight)}, ${this._lerp(60, 110, daylight)}, ${this._lerp(55, 75, daylight)}, ${hillAlpha + 0.1})`;

    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 8) {
      const worldX = x - offset2;
      const hillY = groundY - 20 - Math.sin(worldX * 0.005 + 1) * 25 - Math.sin(worldX * 0.011 + 3) * 15;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw background tree silhouettes.
   */
  _drawBackgroundTrees(ctx, camera, daylight) {
    const groundY = BALANCE.GROUND_Y;
    const treeDarkness = Math.max(0.2, 0.6 - daylight * 0.3);

    for (const tree of this._trees) {
      const screenX = tree.x - camera.x;
      // Skip off-screen trees
      if (screenX < -100 || screenX > ctx.canvas.width + 100) continue;

      ctx.save();
      ctx.globalAlpha = treeDarkness;

      if (tree.type === 0) {
        // Pine tree silhouette
        this._drawPineTree(ctx, screenX, groundY, tree.height);
      } else if (tree.type === 1) {
        // Deciduous tree
        this._drawDeciduousTree(ctx, screenX, groundY, tree.height);
      } else {
        // Dead/bare tree
        this._drawDeadTree(ctx, screenX, groundY, tree.height);
      }

      ctx.restore();
    }
  }

  _drawPineTree(ctx, x, groundY, h) {
    ctx.fillStyle = PALETTE.OUTLINE;
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2;

    // Trunk
    ctx.fillRect(x - 3, groundY - h * 0.3, 6, h * 0.3);

    // Triangular layers
    for (let i = 0; i < 3; i++) {
      const layerY = groundY - h * 0.3 - i * h * 0.25;
      const layerW = 20 + (2 - i) * 12;
      ctx.beginPath();
      ctx.moveTo(x, layerY - h * 0.25);
      ctx.lineTo(x - layerW / 2, layerY);
      ctx.lineTo(x + layerW / 2, layerY);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawDeciduousTree(ctx, x, groundY, h) {
    ctx.fillStyle = PALETTE.OUTLINE;

    // Trunk
    ctx.fillRect(x - 4, groundY - h * 0.4, 8, h * 0.4);

    // Foliage as overlapping circles
    const foliageY = groundY - h * 0.5;
    const r = h * 0.3;
    ctx.beginPath();
    ctx.arc(x, foliageY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.5, foliageY + r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.5, foliageY + r * 0.15, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawDeadTree(ctx, x, groundY, h) {
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Bare trunk
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + 2, groundY - h * 0.7);
    ctx.stroke();

    // Branches
    const branchY = groundY - h * 0.5;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x + 2, branchY);
    ctx.lineTo(x - 15, branchY - h * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 2, branchY - h * 0.1);
    ctx.lineTo(x + 18, branchY - h * 0.25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 2, groundY - h * 0.65);
    ctx.lineTo(x - 10, groundY - h * 0.75);
    ctx.stroke();
  }

  /**
   * Draw the ground with texture.
   */
  _drawGround(ctx, camera, w, h, daylight) {
    const groundY = BALANCE.GROUND_Y;

    // Ground surface gradient
    const grad = ctx.createLinearGradient(0, groundY, 0, h);
    const gR = this._lerp(0x50, 0x68, daylight);
    const gG = this._lerp(0x58, 0x74, daylight);
    const gB = this._lerp(0x40, 0x5a, daylight);
    grad.addColorStop(0, `rgb(${gR},${gG},${gB})`);

    const eR = this._lerp(0x55, 0x75, daylight);
    const eG = this._lerp(0x48, 0x60, daylight);
    const eB = this._lerp(0x38, 0x4b, daylight);
    grad.addColorStop(0.3, `rgb(${eR},${eG},${eB})`);

    const dR = this._lerp(0x3a, 0x55, daylight);
    const dG = this._lerp(0x30, 0x45, daylight);
    const dB = this._lerp(0x25, 0x3a, daylight);
    grad.addColorStop(1, `rgb(${dR},${dG},${dB})`);

    ctx.fillStyle = grad;

    // Wavy ground surface
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 8) {
      const worldX = x + camera.x;
      const wobble = Math.sin(worldX * 0.05) * 1.5 + Math.sin(worldX * 0.13) * 0.8;
      ctx.lineTo(x, groundY + wobble);
    }
    // Ground line emphasis (ink edge)
    ctx.save();
    ctx.strokeStyle = PALETTE.OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Close and fill ground depth
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw fence posts with damage and blood during outbreak.
   */
  _drawFences(ctx, camera, daylight, worldStage = 'normal') {
    const groundY = BALANCE.GROUND_Y;
    const darkness = Math.max(0.3, 0.8 - daylight * 0.3);

    for (const fence of this._fences) {
      const screenX = fence.x - camera.x;
      if (screenX < -20 || screenX > ctx.canvas.width + 20) continue;

      ctx.save();
      ctx.globalAlpha = darkness;
      ctx.strokeStyle = PALETTE.EARTH;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      // If in outbreak, fence around x = 1220-1320 is violently broken down!
      if (worldStage === 'outbreak' && fence.x >= 1220 && fence.x <= 1320) {
        // Broken snapped post lying fallen
        ctx.beginPath();
        ctx.moveTo(screenX, groundY);
        ctx.lineTo(screenX + 18, groundY - 8);
        ctx.stroke();

        // Dark blood stain on grass
        ctx.fillStyle = 'rgba(110, 24, 24, 0.55)';
        ctx.beginPath();
        ctx.ellipse(screenX + 10, groundY - 1, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        continue;
      }

      // Vertical post
      ctx.beginPath();
      ctx.moveTo(screenX, groundY);
      ctx.lineTo(screenX + 1, groundY - fence.height);
      ctx.stroke();

      // Horizontal rails (connect to next post)
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, groundY - fence.height * 0.7);
      ctx.lineTo(screenX + fence.spacing, groundY - fence.height * 0.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(screenX, groundY - fence.height * 0.35);
      ctx.lineTo(screenX + fence.spacing, groundY - fence.height * 0.35);
      ctx.stroke();

      ctx.restore();
    }
  }

  /**
   * Draw grass tufts along the ground.
   */
  _drawGrassTufts(ctx, camera, daylight) {
    const groundY = BALANCE.GROUND_Y;
    const grassAlpha = 0.4 + daylight * 0.3;

    ctx.save();
    ctx.globalAlpha = grassAlpha;
    ctx.strokeStyle = PALETTE.GRASS;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    for (const tuft of this._grassTufts) {
      const screenX = tuft.x - camera.x;
      if (screenX < -20 || screenX > ctx.canvas.width + 20) continue;

      // Draw 3-5 blades per tuft
      for (let b = -2; b <= 2; b++) {
        const bladeX = screenX + b * 3;
        const lean = tuft.lean + b * 0.05;

        ctx.beginPath();
        ctx.moveTo(bladeX, groundY);
        ctx.quadraticCurveTo(
          bladeX + lean * tuft.height * 2,
          groundY - tuft.height * 0.6,
          bladeX + lean * tuft.height * 3,
          groundY - tuft.height
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Draw atmospheric fog layer and apocalyptic haze.
   */
  _drawFog(ctx, w, h, daylight, clock, worldStage = 'normal') {
    const isOutbreak = worldStage === 'outbreak';
    const fogIntensity = clock.isNight() ? 0.18 : 0.06 + (1 - daylight) * 0.1;

    if (fogIntensity > 0.02) {
      const grad = ctx.createLinearGradient(0, BALANCE.GROUND_Y - 80, 0, BALANCE.GROUND_Y + 30);
      const fogColor = isOutbreak ? '90, 35, 35' : '120, 131, 138';
      grad.addColorStop(0, `rgba(${fogColor}, 0)`);
      grad.addColorStop(0.5, `rgba(${fogColor}, ${fogIntensity + (isOutbreak ? 0.08 : 0)})`);
      grad.addColorStop(1, `rgba(${fogColor}, 0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(0, BALANCE.GROUND_Y - 80, w, 110);
    }

    // Vignette effect (blood vignette if outbreak)
    const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
    const edgeColor = isOutbreak ? '45, 15, 15' : '0, 0, 0';
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, `rgba(${edgeColor}, ${0.18 + (1 - daylight) * 0.22})`);
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, w, h);
  }

  // --- Utility ---

  _lerp(a, b, t) {
    return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
  }

  _lerpColor(colorA, colorB, t) {
    // Simple hex lerp
    const a = this._hexToRgb(colorA);
    const b = this._hexToRgb(colorB);
    const r = this._lerp(a.r, b.r, t);
    const g = this._lerp(a.g, b.g, t);
    const bl = this._lerp(a.b, b.b, t);
    return `rgb(${r},${g},${bl})`;
  }

  _hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
}
