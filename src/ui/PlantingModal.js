/**
 * PlantingModal — Dialog for selecting which seed to sow into prepared ranch soil.
 */

import { getItem } from '../data/items.js';

export class PlantingModal {
  /**
   * @param {HTMLElement} container
   * @param {object} context
   * @param {import('../core/Inventory.js').Inventory} context.inventory
   * @param {Function} context.onPlantSeed - (seedItemId) => void
   * @param {Function} context.onClose
   */
  constructor(container, { inventory, onPlantSeed, onClose }) {
    this.container = container;
    this.inventory = inventory;
    this.onPlantSeed = onPlantSeed;
    this.onClose = onClose;

    this._element = null;
  }

  open() {
    this._element = this._buildUI();
    this.container.appendChild(this._element);
    this._bindEvents();
  }

  close() {
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
      this._element = null;
    }
    if (this.onClose) this.onClose();
  }

  _buildUI() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay planting-overlay';

    // Find all seeds in inventory
    const seedSlots = this.inventory.getDetailedSlots().filter((s) => s.item.category === 'seed');

    overlay.innerHTML = `
      <div class="planting-panel">
        <header class="planting-header">
          <h2 class="planting-title">Plant Seeds</h2>
          <p class="planting-subtitle">Select seeds from your inventory to cultivate in the fertile soil.</p>
        </header>

        <div class="planting-content">
          ${seedSlots.length === 0 ? `
            <div class="empty-seeds-box">
              <p>You have no seeds in your inventory.</p>
              <p class="empty-sub">Visit the County General Store down the road to purchase Sweet Corn or Vine Tomato seeds.</p>
            </div>
          ` : `
            <div class="seeds-grid">
              ${seedSlots.map((slot) => {
                const item = slot.item;
                const crop = item.cropData;
                return `
                  <div class="seed-card">
                    <div class="seed-card-header">
                      <span class="seed-name">${item.name}</span>
                      <span class="seed-count">x${slot.count}</span>
                    </div>
                    <p class="seed-desc">${item.description}</p>
                    <div class="seed-specs">
                      <span>⏱️ Growth: ~${crop.growthHours}h</span>
                      <span>🌾 Yield: ${crop.harvestYield}x ${crop.cropName}</span>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm btn-plant" data-id="${item.id}">
                      Sow Seed
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <footer class="planting-footer">
          <button type="button" id="btn-close-planting" class="btn btn-secondary">Cancel</button>
        </footer>
      </div>
    `;

    return overlay;
  }

  _bindEvents() {
    this._element.querySelector('#btn-close-planting').addEventListener('click', () => {
      this.close();
    });

    this._element.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-plant');
      if (!btn) return;
      const seedId = btn.dataset.id;
      this.close();
      this.onPlantSeed(seedId);
    });
  }
}
