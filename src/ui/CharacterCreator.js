/**
 * CharacterCreator — Character creation screen.
 * Handles appearance customization with live Canvas stickman preview,
 * occupation selection, location picking, and trait budget validation.
 */

import { CharacterRenderer } from '../render/CharacterRenderer.js';
import { getAllOccupations } from '../data/occupations.js';
import { getAllTraits, validateTraits } from '../data/traits.js';
import { getAllLocations } from '../data/locations.js';
import { PALETTE } from '../data/balance.js';

export class CharacterCreator {
  /**
   * @param {HTMLElement} container
   * @param {Function} onConfirm - Callback(characterData) when confirmed
   * @param {Function} onCancel - Callback() when player returns to title
   */
  constructor(container, onConfirm, onCancel) {
    this.container = container;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    this.charRenderer = new CharacterRenderer();
    this._animFrameId = null;
    this._animTime = 0;

    // Available options
    this.skinColors = ['#F5D6B8', '#E6CBA8', '#C9A378', '#9C6F44', '#5E3E26'];
    this.hairColors = ['#29231E', '#4A3728', '#8B5A2B', '#D1A354', '#8A8D91'];
    this.hairStyles = [
      { id: 'messy', label: 'Messy' },
      { id: 'short', label: 'Short' },
      { id: 'ponytail', label: 'Ponytail' },
      { id: 'bald', label: 'Bald' },
    ];
    this.clothingStyles = [
      { id: 'casual', label: 'Casual Shirt' },
      { id: 'workwear', label: 'Work Overalls' },
      { id: 'jacket', label: 'Field Jacket' },
    ];
    this.shirtColors = ['#5a7090', '#7a5a3a', '#4d684e', '#8a4b43', '#535b68'];
    this.pantsColors = ['#3a4555', '#2f3b48', '#3c4a3b', '#2b2a28', '#4a4138'];

    // Current selection state
    this.state = {
      name: 'Elias Vance',
      skinColor: this.skinColors[1],
      hairColor: this.hairColors[1],
      hairStyle: 'messy',
      shirtColor: this.shirtColors[0],
      pantsColor: this.pantsColors[0],
      shoeColor: PALETTE.SHOE_DEFAULT,
      clothingStyle: 'casual',
      location: 'ranch',
      occupation: 'farmer',
      traits: new Set(),
    };

    this._element = null;
  }

  /**
   * Mount and show character creator.
   */
  open() {
    this._element = this._buildUI();
    this.container.appendChild(this._element);

    this._previewCanvas = this._element.querySelector('#creator-preview-canvas');
    this._previewCtx = this._previewCanvas.getContext('2d');

    this._bindEvents();
    this._updateValidation();
    this._startPreviewAnimation();
  }

  /**
   * Close and destroy character creator.
   */
  close() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
      this._element = null;
    }
  }

  /**
   * Build HTML template.
   * @private
   */
  _buildUI() {
    const occupations = getAllOccupations();
    const traits = getAllTraits();
    const locations = getAllLocations();

    const overlay = document.createElement('div');
    overlay.id = 'creator-overlay';
    overlay.className = 'overlay creator-overlay';

    overlay.innerHTML = `
      <div class="creator-panel">
        <header class="creator-header">
          <h2 class="creator-title">Survivor Identity</h2>
          <p class="creator-subtitle">Define your background and traits before the world changes.</p>
        </header>

        <div class="creator-body">
          <!-- Left: Live Preview & Name -->
          <div class="creator-preview-pane">
            <div class="preview-canvas-card">
              <canvas id="creator-preview-canvas" width="220" height="260"></canvas>
            </div>
            
            <div class="form-group name-group">
              <label for="char-name-input">Survivor Name</label>
              <input type="text" id="char-name-input" class="text-input" value="${this.state.name}" maxlength="24" placeholder="Enter name..." />
            </div>

            <button type="button" id="btn-randomize-appearance" class="btn btn-secondary btn-sm" title="Randomize look">
              🎲 Randomize Look
            </button>
          </div>

          <!-- Right: Customization Sections -->
          <div class="creator-tabs-pane">
            <!-- Section 1: Appearance -->
            <section class="creator-section">
              <h3 class="section-title">1. Appearance</h3>

              <!-- Skin Tone -->
              <div class="option-row">
                <span class="option-label">Skin Tone</span>
                <div class="swatch-group" data-prop="skinColor">
                  ${this.skinColors.map((color, i) => `
                    <button type="button" class="swatch ${color === this.state.skinColor ? 'selected' : ''}" style="background-color: ${color};" data-val="${color}" title="Skin Tone ${i + 1}"></button>
                  `).join('')}
                </div>
              </div>

              <!-- Hair Style -->
              <div class="option-row">
                <span class="option-label">Hair Style</span>
                <div class="pill-group" data-prop="hairStyle">
                  ${this.hairStyles.map((style) => `
                    <button type="button" class="pill-btn ${style.id === this.state.hairStyle ? 'selected' : ''}" data-val="${style.id}">${style.label}</button>
                  `).join('')}
                </div>
              </div>

              <!-- Hair Color -->
              <div class="option-row">
                <span class="option-label">Hair Color</span>
                <div class="swatch-group" data-prop="hairColor">
                  ${this.hairColors.map((color) => `
                    <button type="button" class="swatch ${color === this.state.hairColor ? 'selected' : ''}" style="background-color: ${color};" data-val="${color}"></button>
                  `).join('')}
                </div>
              </div>

              <!-- Clothing Style -->
              <div class="option-row">
                <span class="option-label">Clothing</span>
                <div class="pill-group" data-prop="clothingStyle">
                  ${this.clothingStyles.map((style) => `
                    <button type="button" class="pill-btn ${style.id === this.state.clothingStyle ? 'selected' : ''}" data-val="${style.id}">${style.label}</button>
                  `).join('')}
                </div>
              </div>

              <!-- Shirt & Pants Colors -->
              <div class="option-row">
                <span class="option-label">Shirt Color</span>
                <div class="swatch-group" data-prop="shirtColor">
                  ${this.shirtColors.map((color) => `
                    <button type="button" class="swatch ${color === this.state.shirtColor ? 'selected' : ''}" style="background-color: ${color};" data-val="${color}"></button>
                  `).join('')}
                </div>
              </div>

              <div class="option-row">
                <span class="option-label">Pants Color</span>
                <div class="swatch-group" data-prop="pantsColor">
                  ${this.pantsColors.map((color) => `
                    <button type="button" class="swatch ${color === this.state.pantsColor ? 'selected' : ''}" style="background-color: ${color};" data-val="${color}"></button>
                  `).join('')}
                </div>
              </div>
            </section>

            <!-- Section 2: Starting Location -->
            <section class="creator-section">
              <h3 class="section-title">2. Starting Location</h3>
              <div class="card-grid">
                ${locations.map((loc) => `
                  <div class="choice-card ${loc.playable ? 'selectable' : 'locked'} ${loc.id === this.state.location ? 'selected' : ''}" data-type="location" data-id="${loc.id}">
                    <div class="card-header">
                      <h4 class="card-title">${loc.name}</h4>
                      <span class="badge ${loc.playable ? 'badge-primary' : 'badge-muted'}">
                        ${loc.playable ? 'Playable' : 'Coming Soon'}
                      </span>
                    </div>
                    <p class="card-desc">${loc.tagline}</p>
                  </div>
                `).join('')}
              </div>
            </section>

            <!-- Section 3: Occupation -->
            <section class="creator-section">
              <h3 class="section-title">3. Occupation</h3>
              <div class="card-grid">
                ${occupations.map((occ) => `
                  <div class="choice-card ${occ.available ? 'selectable' : 'locked'} ${occ.id === this.state.occupation ? 'selected' : ''}" data-type="occupation" data-id="${occ.id}">
                    <div class="card-header">
                      <h4 class="card-title">${occ.name}</h4>
                      <span class="badge ${occ.available ? 'badge-primary' : 'badge-muted'}">
                        ${occ.available ? `+$${occ.startingMoney}` : 'Coming Soon'}
                      </span>
                    </div>
                    <p class="card-desc">${occ.description}</p>
                    ${occ.perks ? `
                      <ul class="perk-list">
                        ${occ.perks.map((p) => `<li>• ${p}</li>`).join('')}
                      </ul>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </section>

            <!-- Section 4: Traits & Balancing -->
            <section class="creator-section">
              <div class="traits-header-bar">
                <h3 class="section-title">4. Traits</h3>
                <div id="points-badge" class="points-badge">
                  Available Points: <strong id="points-val">0</strong>
                </div>
              </div>

              <!-- Positive Traits -->
              <h5 class="trait-subheading positive-subheading">Positive Traits (Cost Points)</h5>
              <div class="trait-grid">
                ${traits.positive.map((t) => `
                  <div class="trait-card positive ${this.state.traits.has(t.id) ? 'selected' : ''}" data-trait-id="${t.id}">
                    <div class="trait-header">
                      <span class="trait-name">${t.name}</span>
                      <span class="trait-cost cost-positive">-${t.cost} pts</span>
                    </div>
                    <p class="trait-desc">${t.description}</p>
                  </div>
                `).join('')}
              </div>

              <!-- Negative Traits -->
              <h5 class="trait-subheading negative-subheading">Negative Traits (Grants Points — Max 3, Max +6 pts)</h5>
              <div class="trait-grid">
                ${traits.negative.map((t) => `
                  <div class="trait-card negative ${this.state.traits.has(t.id) ? 'selected' : ''}" data-trait-id="${t.id}">
                    <div class="trait-header">
                      <span class="trait-name">${t.name}</span>
                      <span class="trait-cost cost-negative">+${Math.abs(t.cost)} pts</span>
                    </div>
                    <p class="trait-desc">${t.description}</p>
                  </div>
                `).join('')}
              </div>

              <div id="validation-errors" class="validation-box hidden"></div>
            </section>
          </div>
        </div>

        <footer class="creator-footer">
          <button type="button" id="btn-cancel-creator" class="btn btn-secondary">Back</button>
          <button type="button" id="btn-start-game" class="btn btn-primary btn-large">Begin Life on Ranch</button>
        </footer>
      </div>
    `;

    return overlay;
  }

  /**
   * Bind DOM event listeners.
   * @private
   */
  _bindEvents() {
    // Name input
    const nameInput = this._element.querySelector('#char-name-input');
    nameInput.addEventListener('input', (e) => {
      this.state.name = e.target.value.trim() || 'Survivor';
    });

    // Swatches (skin, hair, shirt, pants)
    this._element.querySelectorAll('.swatch-group').forEach((group) => {
      const prop = group.dataset.prop;
      group.addEventListener('click', (e) => {
        const swatch = e.target.closest('.swatch');
        if (!swatch) return;
        group.querySelectorAll('.swatch').forEach((s) => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.state[prop] = swatch.dataset.val;
      });
    });

    // Pill buttons (hairStyle, clothingStyle)
    this._element.querySelectorAll('.pill-group').forEach((group) => {
      const prop = group.dataset.prop;
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill-btn');
        if (!btn) return;
        group.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.state[prop] = btn.dataset.val;
      });
    });

    // Randomize appearance
    this._element.querySelector('#btn-randomize-appearance').addEventListener('click', () => {
      this._randomizeAppearance();
    });

    // Occupation selection
    this._element.querySelectorAll('.choice-card[data-type="occupation"].selectable').forEach((card) => {
      card.addEventListener('click', () => {
        this._element.querySelectorAll('.choice-card[data-type="occupation"]').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.state.occupation = card.dataset.id;
      });
    });

    // Trait toggles
    this._element.querySelectorAll('.trait-card').forEach((card) => {
      card.addEventListener('click', () => {
        const traitId = card.dataset.traitId;
        if (this.state.traits.has(traitId)) {
          this.state.traits.delete(traitId);
          card.classList.remove('selected');
        } else {
          this.state.traits.add(traitId);
          card.classList.add('selected');
        }
        this._updateValidation();
      });
    });

    // Cancel / Back button
    this._element.querySelector('#btn-cancel-creator').addEventListener('click', () => {
      this.close();
      if (this.onCancel) this.onCancel();
    });

    // Start game button
    this._element.querySelector('#btn-start-game').addEventListener('click', () => {
      const val = validateTraits(Array.from(this.state.traits));
      if (!val.valid) return;

      const characterData = {
        name: this.state.name,
        skinColor: this.state.skinColor,
        hairColor: this.hairColor || this.state.hairColor,
        hairStyle: this.state.hairStyle,
        shirtColor: this.state.shirtColor,
        pantsColor: this.state.pantsColor,
        shoeColor: this.state.shoeColor,
        clothingStyle: this.state.clothingStyle,
        location: this.state.location,
        occupation: this.state.occupation,
        traits: Array.from(this.state.traits),
      };

      this.close();
      if (this.onConfirm) this.onConfirm(characterData);
    });
  }

  /**
   * Randomize appearance values.
   * @private
   */
  _randomizeAppearance() {
    this.state.skinColor = this.skinColors[Math.floor(Math.random() * this.skinColors.length)];
    this.state.hairColor = this.hairColors[Math.floor(Math.random() * this.hairColors.length)];
    this.state.hairStyle = this.hairStyles[Math.floor(Math.random() * this.hairStyles.length)].id;
    this.state.shirtColor = this.shirtColors[Math.floor(Math.random() * this.shirtColors.length)];
    this.state.pantsColor = this.pantsColors[Math.floor(Math.random() * this.pantsColors.length)];
    this.state.clothingStyle = this.clothingStyles[Math.floor(Math.random() * this.clothingStyles.length)].id;

    // Refresh UI highlights
    this._refreshSelectionUI();
  }

  /**
   * Refresh swatch and pill button active classes to match state.
   * @private
   */
  _refreshSelectionUI() {
    this._element.querySelectorAll('.swatch-group').forEach((group) => {
      const prop = group.dataset.prop;
      group.querySelectorAll('.swatch').forEach((s) => {
        s.classList.toggle('selected', s.dataset.val === this.state[prop]);
      });
    });
    this._element.querySelectorAll('.pill-group').forEach((group) => {
      const prop = group.dataset.prop;
      group.querySelectorAll('.pill-btn').forEach((b) => {
        b.classList.toggle('selected', b.dataset.val === this.state[prop]);
      });
    });
  }

  /**
   * Update points badge and validation feedback.
   * @private
   */
  _updateValidation() {
    const val = validateTraits(Array.from(this.state.traits));
    const pointsValEl = this._element.querySelector('#points-val');
    const badgeEl = this._element.querySelector('#points-badge');
    const startBtn = this._element.querySelector('#btn-start-game');
    const errorBox = this._element.querySelector('#validation-errors');

    pointsValEl.textContent = val.remainingPoints;

    if (val.remainingPoints < 0) {
      badgeEl.classList.add('negative-balance');
    } else {
      badgeEl.classList.remove('negative-balance');
    }

    if (!val.valid) {
      startBtn.disabled = true;
      errorBox.classList.remove('hidden');
      errorBox.innerHTML = val.errors.map((e) => `<p>⚠️ ${e}</p>`).join('');
    } else {
      startBtn.disabled = false;
      errorBox.classList.add('hidden');
      errorBox.innerHTML = '';
    }
  }

  /**
   * Run live character rendering preview on canvas.
   * @private
   */
  _startPreviewAnimation() {
    const render = () => {
      this._animTime += 0.025;
      const ctx = this._previewCtx;
      const w = this._previewCanvas.width;
      const h = this._previewCanvas.height;

      ctx.clearRect(0, 0, w, h);

      // Background podium glow
      const podGrad = ctx.createRadialGradient(w / 2, h - 35, 10, w / 2, h - 35, 75);
      podGrad.addColorStop(0, 'rgba(230, 173, 97, 0.18)');
      podGrad.addColorStop(1, 'rgba(26, 30, 36, 0)');
      ctx.fillStyle = podGrad;
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 35, 65, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ground ink line
      ctx.strokeStyle = PALETTE.OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 50, h - 35);
      ctx.lineTo(w / 2 + 50, h - 35);
      ctx.stroke();

      // Character appearance object
      const appearance = {
        skinColor: this.state.skinColor,
        hairColor: this.state.hairColor,
        hairStyle: this.state.hairStyle,
        shirtColor: this.state.shirtColor,
        pantsColor: this.state.pantsColor,
        shoeColor: this.state.shoeColor,
        clothingStyle: this.state.clothingStyle,
      };

      // Gentle breathing idle phase
      const idlePhase = (Math.sin(this._animTime) + 1) * 0.08;

      this.charRenderer.draw(
        ctx,
        w / 2,
        h - 35,
        appearance,
        1,          // Facing right
        idlePhase,  // Gentle idle
        false       // Idle
      );

      this._animFrameId = requestAnimationFrame(render);
    };

    render();
  }
}
