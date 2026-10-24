/**
 * InventoryModal — Displays player items, descriptions, and allows consuming food/water.
 */

import { getItem } from '../data/items.js';

export class InventoryModal {
  /**
   * @param {HTMLElement} container
   * @param {object} context
   * @param {import('../core/Inventory.js').Inventory} context.inventory
   * @param {import('../core/NeedsSystem.js').NeedsSystem} context.needs
   * @param {Function} context.onToast
   * @param {Function} context.onClose
   */
  constructor(container, { inventory, needs, onToast, onClose }) {
    this.container = container;
    this.inventory = inventory;
    this.needs = needs;
    this.onToast = onToast;
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
    overlay.className = 'overlay inventory-overlay';

    const slots = this.inventory.getDetailedSlots();

    overlay.innerHTML = `
      <div class="inventory-panel">
        <header class="inventory-header">
          <div>
            <h2 class="inventory-title">Survival Backpack</h2>
            <p class="inventory-subtitle">Equipped gear, provisions, and gathered resources.</p>
          </div>
          <span class="slot-counter">${this.inventory.slots.length} / ${this.inventory.capacity} Slots</span>
        </header>

        <div class="inventory-content">
          ${slots.length === 0 ? `
            <div class="empty-inventory">
              <p>Your pack is completely empty.</p>
              <p class="empty-sub">Visit the County Store or harvest crops to gather provisions.</p>
            </div>
          ` : `
            <div class="inventory-grid">
              ${slots.map((slot) => {
                const item = slot.item;
                const isConsumable = item.category === 'food' || item.category === 'drink';
                return `
                  <div class="inventory-slot-card" data-item-id="${item.id}">
                    <div class="slot-card-header">
                      <span class="slot-item-name">${item.name}</span>
                      <span class="slot-count">x${slot.count}</span>
                    </div>
                    <span class="category-tag tag-${item.category}">${item.category.toUpperCase()}</span>
                    <p class="slot-item-desc">${item.description}</p>
                    ${isConsumable ? `
                      <button type="button" class="btn btn-primary btn-sm btn-consume" data-id="${item.id}">
                        Consume
                      </button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <footer class="inventory-footer">
          <p class="inventory-hint">Press <kbd>I</kbd> or <kbd>Escape</kbd> to close</p>
          <button type="button" id="btn-close-inv" class="btn btn-secondary">Close</button>
        </footer>
      </div>
    `;

    return overlay;
  }

  _bindEvents() {
    this._element.querySelector('#btn-close-inv').addEventListener('click', () => {
      this.close();
    });

    this._element.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-consume');
      if (!btn) return;
      const itemId = btn.dataset.id;
      this._handleConsume(itemId);
    });
  }

  _handleConsume(itemId) {
    const item = getItem(itemId);
    if (!item || !this.inventory.hasItem(itemId, 1)) return;

    // Apply item effects
    this.needs.consume(item);
    this.inventory.removeItem(itemId, 1);
    this.onToast(`Consumed 1x ${item.name}.`);

    // Refresh view
    const newElement = this._buildUI();
    this._element.replaceWith(newElement);
    this._element = newElement;
    this._bindEvents();
  }
}
