/**
 * ShopModal — General Store interface for purchasing provisions, seeds, and tools,
 * and selling harvested farm produce.
 */

import { getShopCatalog, getItem } from '../data/items.js';

export class ShopModal {
  /**
   * @param {HTMLElement} container
   * @param {object} context
   * @param {import('../core/Inventory.js').Inventory} context.inventory
   * @param {number} context.money
   * @param {Function} context.onMoneyChange - (newAmount) => void
   * @param {Function} context.onToast - (message) => void
   * @param {Function} context.onClose
   */
  constructor(container, { inventory, getMoney, setMoney, onToast, onClose }) {
    this.container = container;
    this.inventory = inventory;
    this.getMoney = getMoney;
    this.setMoney = setMoney;
    this.onToast = onToast;
    this.onClose = onClose;

    this.activeTab = 'buy'; // 'buy' or 'sell'
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
    overlay.className = 'overlay shop-overlay';

    const currentMoney = this.getMoney();
    const catalog = getShopCatalog();
    const inventorySlots = this.inventory.getDetailedSlots();

    overlay.innerHTML = `
      <div class="shop-panel">
        <header class="shop-header">
          <div>
            <h2 class="shop-title">County General Store</h2>
            <p class="shop-subtitle">Essential seeds, dry goods, and provisions.</p>
          </div>
          <div class="shop-wallet">
            Funds: <strong id="shop-funds-val">$${currentMoney}</strong>
          </div>
        </header>

        <div class="shop-tabs">
          <button type="button" class="shop-tab-btn ${this.activeTab === 'buy' ? 'active' : ''}" data-tab="buy">Buy Provisions</button>
          <button type="button" class="shop-tab-btn ${this.activeTab === 'sell' ? 'active' : ''}" data-tab="sell">Sell Produce</button>
        </div>

        <div class="shop-content">
          <!-- Buy Catalog -->
          <div id="tab-buy" class="shop-grid ${this.activeTab === 'buy' ? '' : 'hidden'}">
            ${catalog.map((item) => `
              <div class="shop-item-card" data-item-id="${item.id}">
                <div class="item-header">
                  <span class="item-name">${item.name}</span>
                  <span class="item-price">$${item.price}</span>
                </div>
                <p class="item-desc">${item.description}</p>
                <button type="button" class="btn btn-primary btn-sm btn-buy" data-id="${item.id}" ${currentMoney < item.price ? 'disabled' : ''}>
                  Buy ($${item.price})
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Sell Inventory -->
          <div id="tab-sell" class="shop-grid ${this.activeTab === 'sell' ? '' : 'hidden'}">
            ${inventorySlots.length === 0 ? `
              <p class="empty-shop-msg">Your inventory is empty. Harvest crops or gather materials to sell.</p>
            ` : inventorySlots.map((slot) => {
              const item = slot.item;
              return `
                <div class="shop-item-card" data-item-id="${item.id}">
                  <div class="item-header">
                    <span class="item-name">${item.name} (x${slot.count})</span>
                    <span class="item-price">+$${item.sellPrice} ea</span>
                  </div>
                  <p class="item-desc">${item.description}</p>
                  <button type="button" class="btn btn-secondary btn-sm btn-sell" data-id="${item.id}">
                    Sell 1 (+$${item.sellPrice})
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <footer class="shop-footer">
          <span class="capacity-info">Inventory: ${this.inventory.slots.length} / ${this.inventory.capacity} slots</span>
          <button type="button" id="btn-close-shop" class="btn btn-secondary">Close</button>
        </footer>
      </div>
    `;

    return overlay;
  }

  _bindEvents() {
    // Close button
    this._element.querySelector('#btn-close-shop').addEventListener('click', () => {
      this.close();
    });

    // Tab buttons
    this._element.querySelectorAll('.shop-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this._element.querySelectorAll('.shop-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        this._element.querySelector('#tab-buy').classList.toggle('hidden', this.activeTab !== 'buy');
        this._element.querySelector('#tab-sell').classList.toggle('hidden', this.activeTab !== 'sell');
      });
    });

    // Buy actions
    this._element.querySelector('#tab-buy').addEventListener('click', (e) => {
      const buyBtn = e.target.closest('.btn-buy');
      if (!buyBtn) return;
      const itemId = buyBtn.dataset.id;
      this._handleBuy(itemId);
    });

    // Sell actions
    this._element.querySelector('#tab-sell').addEventListener('click', (e) => {
      const sellBtn = e.target.closest('.btn-sell');
      if (!sellBtn) return;
      const itemId = sellBtn.dataset.id;
      this._handleSell(itemId);
    });
  }

  _handleBuy(itemId) {
    const item = getItem(itemId);
    if (!item) return;

    const currentMoney = this.getMoney();
    if (currentMoney < item.price) {
      this.onToast('Not enough money to purchase this item.');
      return;
    }

    if (!this.inventory.canAccept(itemId, 1)) {
      this.onToast('Your inventory is completely full!');
      return;
    }

    // Process transaction
    this.setMoney(currentMoney - item.price);
    this.inventory.addItem(itemId, 1);
    this.onToast(`Purchased 1x ${item.name} for $${item.price}.`);

    this._refreshView();
  }

  _handleSell(itemId) {
    const item = getItem(itemId);
    if (!item) return;

    if (!this.inventory.hasItem(itemId, 1)) {
      this.onToast('You no longer have this item.');
      return;
    }

    // Process sale
    this.inventory.removeItem(itemId, 1);
    const newMoney = this.getMoney() + item.sellPrice;
    this.setMoney(newMoney);
    this.onToast(`Sold 1x ${item.name} for +$${item.sellPrice}.`);

    this._refreshView();
  }

  _refreshView() {
    const newElement = this._buildUI();
    this._element.replaceWith(newElement);
    this._element = newElement;
    this._bindEvents();
  }
}
