/**
 * PackFitTemplate.js — Reusable Pack and Fit Mini-Game Template.
 * Pack emergency survival supplies into a container or backpack without exceeding capacity.
 * Used for Backpack Stacking, Supply Trunk Packing, and Emergency Kit Caching.
 */

import { getQualityTier, createRewardId } from '../contracts.js';

export const DEFAULT_PACK_ITEMS = [
  { id: 'canned_food', name: 'Canned Rations', size: 2, value: 25, icon: '🥫' },
  { id: 'water_flask', name: 'Purified Water', size: 2, value: 30, icon: '🍶' },
  { id: 'med_kit', name: 'First Aid Kit', size: 3, value: 40, icon: '🩹' },
  { id: 'flashlight', name: 'LED Flashlight', size: 1, value: 15, icon: '🔦' },
  { id: 'crowbar', name: 'Steel Crowbar', size: 4, value: 35, icon: '⛏️' },
  { id: 'ammo_box', name: 'Ammunition Box', size: 2, value: 35, icon: '📦' },
  { id: 'blanket', name: 'Warm Blanket', size: 3, value: 20, icon: '🧣' },
  { id: 'matches', name: 'Firestarter Kit', size: 1, value: 15, icon: '🔥' },
];

export class PackFitTemplate {
  /**
   * Mount and run Pack and Fit mini-game.
   * @param {HTMLElement} stageElement - Overlay container.
   * @param {object} derivedParams - Parameters from DifficultySystem.
   * @param {number} [derivedParams.containerCapacity=12] - Max weight/volume capacity.
   * @param {number} [derivedParams.itemCount=6] - Number of candidate items in staging tray.
   * @param {object} context
   * @param {string} [context.activityType='pack_supplies']
   * @param {Array<object>} [context.availableItems]
   * @param {number} [context.gameMinutesSpent=20]
   * @param {Function} context.onSubmit - Callback(MiniGameResult)
   * @param {Function} context.onCancel - Callback()
   * @param {Function} [context.setFeedback] - Callback(msg, type)
   * @param {Function} [context.setProgress] - Callback(percent, label)
   * @param {Function} [context.setActionButton] - Callback(label, onClick)
   */
  static mount(stageElement, derivedParams, {
    activityType = 'pack_supplies',
    availableItems = null,
    gameMinutesSpent = 20,
    onSubmit,
    onCancel,
    setFeedback = () => {},
    setProgress = () => {},
    setActionButton = () => {},
  }) {
    stageElement.innerHTML = '';

    const capacity = Math.max(8, Math.min(18, derivedParams.containerCapacity || 12));
    const count = Math.max(2, Math.min(8, derivedParams.itemCount || 6));

    const sourcePool = Array.isArray(availableItems) && availableItems.length >= count
      ? availableItems
      : DEFAULT_PACK_ITEMS;

    const items = sourcePool.slice(0, count);

    // Track packed state
    const packedItemIds = new Set();
    let currentWeight = 0;
    let totalValue = 0;
    let isResolved = false;

    // Build DOM structure
    const container = document.createElement('div');
    container.className = 'pack-fit-container';
    container.setAttribute('data-testid', 'pack-fit-container');

    container.innerHTML = `
      <div class="pack-header">
        <div class="pack-capacity-info">
          <span>Capacity Usage: <strong id="pack-usage-label">0 / ${capacity} KG</strong></span>
          <span class="pack-value-badge" id="pack-value-badge">Total Value: <strong>0 pts</strong></span>
        </div>
        <div class="pack-capacity-bar-track">
          <div class="pack-capacity-fill" id="pack-capacity-fill" style="width: 0%;"></div>
        </div>
      </div>

      <div class="pack-sections-wrapper">
        <div class="pack-section">
          <h4 class="pack-section-title">Available Supplies (Click to Pack)</h4>
          <div class="pack-items-grid pack-tray-grid" id="pack-tray-grid">
            ${items.map((item) => `
              <button
                class="pack-item-card"
                data-item-id="${item.id}"
                data-size="${item.size}"
                data-value="${item.value}"
                data-testid="tray-item-${item.id}"
              >
                <span class="pack-item-icon">${item.icon || '📦'}</span>
                <div class="pack-item-details">
                  <span class="pack-item-name">${item.name}</span>
                  <span class="pack-item-meta">${item.size} KG · ${item.value} pts</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="pack-section">
          <h4 class="pack-section-title">Packed in Container (Click to Unpack)</h4>
          <div class="pack-items-grid pack-packed-grid" id="pack-packed-grid">
            <div class="pack-empty-placeholder" id="pack-empty-placeholder">
              Container empty. Select supplies on the left to pack.
            </div>
          </div>
        </div>
      </div>
    `;

    stageElement.appendChild(container);

    const usageLabel = container.querySelector('#pack-usage-label');
    const valueBadge = container.querySelector('#pack-value-badge');
    const fillBar = container.querySelector('#pack-capacity-fill');
    const trayGrid = container.querySelector('#pack-tray-grid');
    const packedGrid = container.querySelector('#pack-packed-grid');
    const emptyPlaceholder = container.querySelector('#pack-empty-placeholder');

    setProgress(0, `0/${capacity} KG Loaded`);
    setFeedback('Select essential supplies to optimize storage space and survival value.', 'info');

    // UI Refresh helper
    const updatePackState = () => {
      currentWeight = 0;
      totalValue = 0;

      for (const id of packedItemIds) {
        const item = items.find((i) => i.id === id);
        if (item) {
          currentWeight += item.size;
          totalValue += item.value;
        }
      }

      const fillPct = Math.min(100, Math.round((currentWeight / capacity) * 100));

      if (usageLabel) usageLabel.textContent = `${currentWeight} / ${capacity} KG`;
      if (valueBadge) valueBadge.innerHTML = `Total Value: <strong>${totalValue} pts</strong>`;
      if (fillBar) {
        fillBar.style.width = `${fillPct}%`;
        fillBar.className = 'pack-capacity-fill' + (fillPct >= 90 ? ' near-full' : fillPct > 100 ? ' over-capacity' : '');
      }

      setProgress(fillPct, `${currentWeight}/${capacity} KG`);

      // Refresh card placements
      const trayButtons = trayGrid.querySelectorAll('.pack-item-card');
      trayButtons.forEach((btn) => {
        const id = btn.getAttribute('data-item-id');
        btn.style.display = packedItemIds.has(id) ? 'none' : 'flex';
      });

      // Update packed items in packedGrid
      packedGrid.innerHTML = '';
      if (packedItemIds.size === 0) {
        if (emptyPlaceholder) packedGrid.appendChild(emptyPlaceholder);
      } else {
        for (const id of packedItemIds) {
          const item = items.find((i) => i.id === id);
          if (!item) continue;
          const packedBtn = document.createElement('button');
          packedBtn.className = 'pack-item-card packed-card';
          packedBtn.setAttribute('data-item-id', item.id);
          packedBtn.setAttribute('data-testid', `packed-item-${item.id}`);
          packedBtn.innerHTML = `
            <span class="pack-item-icon">${item.icon || '📦'}</span>
            <div class="pack-item-details">
              <span class="pack-item-name">${item.name}</span>
              <span class="pack-item-meta">${item.size} KG · ${item.value} pts</span>
            </div>
          `;
          packedBtn.addEventListener('click', () => {
            if (isResolved) return;
            packedItemIds.delete(item.id);
            updatePackState();
            setFeedback(`Unpacked ${item.name} back into staging tray.`, 'info');
          });
          packedGrid.appendChild(packedBtn);
        }
      }
    };

    // Tray card click listeners
    const trayButtons = trayGrid.querySelectorAll('.pack-item-card');
    trayButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isResolved) return;
        const id = btn.getAttribute('data-item-id');
        const item = items.find((i) => i.id === id);
        if (!item) return;

        if (currentWeight + item.size > capacity) {
          setFeedback(`Cannot fit ${item.name}! Exceeds remaining weight capacity (${capacity - currentWeight} KG left).`, 'danger');
          fillBar?.classList.add('error-shake');
          setTimeout(() => fillBar?.classList.remove('error-shake'), 400);
          return;
        }

        packedItemIds.add(id);
        updatePackState();
        setFeedback(`Packed ${item.name} (${item.size} KG).`, 'success');
      });
    });

    // Primary action button: Seal and finalize container
    const finalizePacking = () => {
      if (isResolved) return;

      const fillRatio = currentWeight / capacity;

      if (fillRatio < 0.40) {
        setFeedback('Container is mostly empty! Pack more essential supplies before sealing.', 'danger');
        return;
      }

      isResolved = true;

      // Calculate score based on packing density and value ratio
      // Best achievable value estimation
      const possibleValues = items.map((i) => i.value).sort((a, b) => b - a);
      const estMaxValue = possibleValues.slice(0, 4).reduce((sum, v) => sum + v, 0) || 100;
      const efficiency = Math.min(1.0, totalValue / estMaxValue);

      const score = Number(Math.max(0.60, Math.min(1.0, 0.65 + fillRatio * 0.15 + efficiency * 0.20)).toFixed(3));
      const qualityTier = getQualityTier(score);

      setFeedback(`Container sealed securely! Packing tier: ${qualityTier.toUpperCase()}.`, 'success');

      setTimeout(() => {
        onSubmit({
          outcome: 'success',
          score,
          qualityTier,
          gameMinutesSpent,
          rewardId: createRewardId(activityType, `pack_${Date.now()}`),
          metadata: {
            packedCount: packedItemIds.size,
            packedWeight: currentWeight,
            totalValue,
            capacity,
          },
        });
      }, 600);
    };

    setActionButton('Seal & Store Container', finalizePacking);

    return {
      cleanup: () => {
        isResolved = true;
      },
      finalizePacking,
    };
  }
}
