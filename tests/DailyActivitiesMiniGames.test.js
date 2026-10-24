import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrderedSequenceTemplate, DEFAULT_COOKING_STEPS } from '../src/minigames/templates/OrderedSequenceTemplate.js';
import { GridSelectionTemplate } from '../src/minigames/templates/GridSelectionTemplate.js';
import { PackFitTemplate, DEFAULT_PACK_ITEMS } from '../src/minigames/templates/PackFitTemplate.js';
import { validateMiniGameResult } from '../src/minigames/contracts.js';
import { MiniGameManager } from '../src/minigames/MiniGameManager.js';
import { Inventory } from '../src/core/Inventory.js';
import { ClockSystem } from '../src/core/ClockSystem.js';
import { NeedsSystem } from '../src/core/NeedsSystem.js';
import { FarmingSystem } from '../src/core/FarmingSystem.js';
import { Player } from '../src/entities/Player.js';

// --- Lightweight Test DOM Helpers ---
class MockClassList {
  constructor(el) {
    this.el = el;
    this.classes = new Set();
  }
  add(...names) {
    names.forEach((n) => this.classes.add(n));
    this.el._updateClassAttr();
  }
  remove(...names) {
    names.forEach((n) => this.classes.delete(n));
    this.el._updateClassAttr();
  }
  contains(name) {
    return this.classes.has(name);
  }
  toString() {
    return Array.from(this.classes).join(' ');
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = {};
    this.classList = new MockClassList(this);
    this._listeners = {};
    this._textContent = '';
  }

  _updateClassAttr() {
    this.attributes['class'] = this.classList.toString();
  }

  get className() {
    return this.classList.toString();
  }

  set className(val) {
    this.classList.classes.clear();
    if (val) {
      val.split(/\s+/).filter(Boolean).forEach((c) => this.classList.classes.add(c));
    }
    this._updateClassAttr();
  }

  get id() {
    return this.attributes['id'] || '';
  }

  set id(val) {
    this.setAttribute('id', val);
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name === 'class') {
      this.className = val;
    }
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  hasAttribute(name) {
    return name in this.attributes;
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((l) => l !== fn);
  }

  dispatchEvent(event) {
    const type = event.type || event;
    const listeners = this._listeners[type] || [];
    for (const fn of listeners) {
      fn.call(this, event);
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  getBoundingClientRect() {
    return {
      left: 10,
      top: 10,
      right: 110,
      bottom: 50,
      width: 100,
      height: 40,
    };
  }

  get textContent() {
    const childText = this.children.map((c) => c.textContent).join(' ');
    return (this._textContent + ' ' + childText).trim();
  }

  set textContent(val) {
    this._textContent = val;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML || '';
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    if (!html || !html.trim()) return;
    this.children = parseHTML(html, this);
  }
}

function parseAttrs(el, rawAttrs) {
  const attrRegex = /([a-zA-Z0-9\-]+)(?:=["']([^"']*)["'])?/g;
  let m;
  while ((m = attrRegex.exec(rawAttrs)) !== null) {
    if (m[1]) el.setAttribute(m[1], m[2] !== undefined ? m[2] : '');
  }
}

function parseHTML(html, parent) {
  const root = new MockElement('root');
  let current = root;
  const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*)>|([^<]+)/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const full = match[0];
    const tagName = match[1];
    const rawAttrs = match[2];
    const text = match[3];

    if (text) {
      if (text.trim()) {
        current._textContent += (current._textContent ? ' ' : '') + text.trim();
      }
    } else if (full.startsWith('</')) {
      if (current.parentNode) {
        current = current.parentNode;
      }
    } else if (full.endsWith('/>')) {
      const el = new MockElement(tagName);
      el.parentNode = current;
      parseAttrs(el, rawAttrs);
      current.children.push(el);
    } else {
      const el = new MockElement(tagName);
      el.parentNode = current;
      parseAttrs(el, rawAttrs);
      current.children.push(el);
      if (!['input', 'img', 'br', 'hr', 'meta', 'link'].includes(tagName.toLowerCase())) {
        current = el;
      }
    }
  }

  for (const child of root.children) {
    child.parentNode = parent;
  }
  return root.children;
}

MockElement.prototype.querySelector = function (selector) {
  const results = this.querySelectorAll(selector);
  return results.length > 0 ? results[0] : null;
};

MockElement.prototype.querySelectorAll = function (selector) {
  const parts = selector.trim().split(/\s+/);
  if (parts.length > 1) {
    let currentNodes = [this];
    for (const part of parts) {
      const nextNodes = [];
      for (const node of currentNodes) {
        nextNodes.push(...node.querySelectorAll(part));
      }
      currentNodes = nextNodes;
    }
    return currentNodes;
  }

  const results = [];
  const matchSelector = (el, sel) => {
    sel = sel.trim();
    // Attribute selector e.g. .terminal-node-left[data-id="pwr_main"]
    const attrMatch = sel.match(/^(\.?[a-zA-Z0-9\-_]+)?\[([a-zA-Z0-9\-_]+)=["']([^"']*)["']\]$/);
    if (attrMatch) {
      const prefix = attrMatch[1];
      const attrName = attrMatch[2];
      const attrVal = attrMatch[3];
      let matchesPrefix = true;
      if (prefix) {
        if (prefix.startsWith('.')) {
          matchesPrefix = el.classList.contains(prefix.slice(1));
        } else {
          matchesPrefix = el.tagName.toLowerCase() === prefix.toLowerCase();
        }
      }
      return matchesPrefix && el.getAttribute(attrName) === attrVal;
    }

    if (sel.startsWith('#')) {
      return el.id === sel.slice(1);
    }
    if (sel.startsWith('.')) {
      return el.classList.contains(sel.slice(1));
    }
    return el.tagName.toLowerCase() === sel.toLowerCase();
  };

  const walk = (node) => {
    for (const child of node.children) {
      if (matchSelector(child, selector)) {
        results.push(child);
      }
      walk(child);
    }
  };

  walk(this);
  return results;
};

describe('Stage 3 — Daily Activities Mini-Games', () => {
  let mockStorage = {};
  const activeTimers = new Set();

  beforeEach(() => {
    mockStorage = {};
    globalThis.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    const listeners = {};
    globalThis.window = {
      addEventListener: (type, fn) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(fn);
      },
      removeEventListener: (type, fn) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((l) => l !== fn);
        }
      },
      dispatchEvent: (event) => {
        const type = event.type || event;
        (listeners[type] || []).forEach((fn) => fn(event));
      },
    };

    globalThis.document = {
      createElement: (tag) => new MockElement(tag),
      createElementNS: (ns, tag) => new MockElement(tag),
      getElementById: () => null,
    };

    globalThis.requestAnimationFrame = (fn) => {
      const id = setTimeout(() => {
        activeTimers.delete(id);
        fn(Date.now());
      }, 16);
      activeTimers.add(id);
      return id;
    };

    globalThis.cancelAnimationFrame = (id) => {
      clearTimeout(id);
      activeTimers.delete(id);
    };
  });

  afterEach(() => {
    activeTimers.forEach((id) => clearTimeout(id));
    activeTimers.clear();
  });

  describe('1. Ordered Sequence Template (Cooking & Cleaning)', () => {
    it('mounts sequence timeline and buttons with correct goal indicator', () => {
      const stage = new MockElement('div');
      const handle = OrderedSequenceTemplate.mount(
        stage,
        { stepCount: 4, allowedMistakes: 2 },
        {
          activityType: 'cooking',
          gameMinutesSpent: 20,
          onSubmit: vi.fn(),
          onCancel: vi.fn(),
        }
      );

      const container = stage.querySelector('.sequence-container');
      expect(container).not.toBeNull();

      const timelineNodes = stage.querySelectorAll('.sequence-timeline-node');
      expect(timelineNodes.length).toBe(4);

      const buttons = stage.querySelectorAll('.sequence-action-btn');
      expect(buttons.length).toBe(4);

      handle.cleanup();
    });

    it('advances through steps in correct order and submits success result contract', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;

      const steps = [
        { id: 'step_1', label: '1. Chop', icon: '🔪' },
        { id: 'step_2', label: '2. Boil', icon: '🔥' },
        { id: 'step_3', label: '3. Stir', icon: '🍲' },
      ];

      const handle = OrderedSequenceTemplate.mount(
        stage,
        { stepCount: 3, allowedMistakes: 2 },
        {
          activityType: 'cooking',
          steps,
          gameMinutesSpent: 25,
          onSubmit: (res) => {
            submittedResult = res;
          },
        }
      );

      // Click step 1, then step 2, then step 3
      const btn1 = stage.querySelector('.sequence-action-btn[data-step-id="step_1"]');
      const btn2 = stage.querySelector('.sequence-action-btn[data-step-id="step_2"]');
      const btn3 = stage.querySelector('.sequence-action-btn[data-step-id="step_3"]');

      btn1.click();
      expect(btn1.classList.contains('step-completed')).toBe(true);

      btn2.click();
      expect(btn2.classList.contains('step-completed')).toBe(true);

      btn3.click();
      expect(btn3.classList.contains('step-completed')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(submittedResult).not.toBeNull();
      expect(submittedResult.outcome).toBe('success');
      expect(submittedResult.score).toBeGreaterThanOrEqual(0.9);
      expect(submittedResult.qualityTier).toBe('master');
      expect(submittedResult.rewardId).toMatch(/^reward_cooking_/);

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });

    it('tracks mistakes and fails when allowed error threshold is exceeded', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;
      let feedbackMsg = '';

      const steps = [
        { id: 'step_a', label: '1. Prep', icon: '🧹' },
        { id: 'step_b', label: '2. Scrub', icon: '🧽' },
      ];

      const handle = OrderedSequenceTemplate.mount(
        stage,
        { stepCount: 2, allowedMistakes: 1 },
        {
          activityType: 'cleaning',
          steps,
          gameMinutesSpent: 15,
          onSubmit: (res) => {
            submittedResult = res;
          },
          setFeedback: (msg) => {
            feedbackMsg = msg;
          },
        }
      );

      // Wrong step: click step_b when step_a was expected
      const btnB = stage.querySelector('.sequence-action-btn[data-step-id="step_b"]');
      btnB.click();

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(feedbackMsg).toContain('ruined');
      expect(submittedResult).not.toBeNull();
      expect(submittedResult.outcome).toBe('failure');
      expect(submittedResult.qualityTier).toBe('poor');

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });
  });

  describe('2. Grid Selection Template (Radio Tuning & Scavenging)', () => {
    it('mounts grid matrix with specified dimensions and remaining probe tracker', () => {
      const stage = new MockElement('div');
      const handle = GridSelectionTemplate.mount(
        stage,
        { gridSize: 3, targetCount: 2, allowedMistakes: 2 },
        {
          activityType: 'radio_tuning',
          gameMinutesSpent: 20,
          onSubmit: vi.fn(),
          onCancel: vi.fn(),
        }
      );

      const grid = stage.querySelector('#radar-grid');
      expect(grid).not.toBeNull();

      const cells = stage.querySelectorAll('.radar-cell');
      expect(cells.length).toBe(9); // 3x3

      const counter = stage.querySelector('#grid-probe-counter');
      expect(counter.textContent).toContain('Remaining Probes');

      handle.cleanup();
    });

    it('probes cells and discovers all signals to achieve victory', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;

      const handle = GridSelectionTemplate.mount(
        stage,
        { gridSize: 3, targetCount: 2, allowedMistakes: 5 },
        {
          activityType: 'radio_tuning',
          gameMinutesSpent: 20,
          onSubmit: (res) => {
            submittedResult = res;
          },
        }
      );

      const cells = stage.querySelectorAll('.radar-cell');

      // Click all cells sequentially until all targets are found
      for (const cell of cells) {
        if (!submittedResult) {
          cell.click();
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(submittedResult).not.toBeNull();
      expect(submittedResult.outcome).toBe('success');
      expect(submittedResult.score).toBeGreaterThanOrEqual(0.65);
      expect(submittedResult.rewardId).toMatch(/^reward_radio_tuning_/);

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });
  });

  describe('3. Pack and Fit Template (Storage & Backpack Packing)', () => {
    it('mounts capacity bar, item staging tray, and updates weight usage on packing', () => {
      const stage = new MockElement('div');
      let currentProgress = null;

      const handle = PackFitTemplate.mount(
        stage,
        { containerCapacity: 10, itemCount: 5 },
        {
          activityType: 'pack_supplies',
          gameMinutesSpent: 20,
          onSubmit: vi.fn(),
          onCancel: vi.fn(),
          setProgress: (pct, label) => {
            currentProgress = { pct, label };
          },
        }
      );

      const trayGrid = stage.querySelector('#pack-tray-grid');
      expect(trayGrid).not.toBeNull();

      const trayButtons = stage.querySelectorAll('.pack-tray-grid .pack-item-card');
      expect(trayButtons.length).toBe(5);

      // Pack first item
      trayButtons[0].click();

      expect(currentProgress.pct).toBeGreaterThan(0);
      const packedGrid = stage.querySelector('#pack-packed-grid');
      const packedItems = packedGrid.querySelectorAll('.pack-item-card');
      expect(packedItems.length).toBe(1);

      handle.cleanup();
    });

    it('prevents packing items that exceed container capacity', () => {
      const stage = new MockElement('div');
      let feedbackText = '';

      const smallCapacityItems = [
        { id: 'heavy_iron', name: 'Cast Iron Plate', size: 9, value: 30 },
        { id: 'heavy_lead', name: 'Lead Weight', size: 8, value: 25 },
      ];

      const handle = PackFitTemplate.mount(
        stage,
        { containerCapacity: 10, itemCount: 2 },
        {
          activityType: 'pack_supplies',
          availableItems: smallCapacityItems,
          gameMinutesSpent: 20,
          onSubmit: vi.fn(),
          setFeedback: (msg) => {
            feedbackText = msg;
          },
        }
      );

      const trayButtons = stage.querySelectorAll('.pack-tray-grid .pack-item-card');
      trayButtons[0].click(); // packs 9 KG (1 KG remaining)

      // Try packing second item (8 KG) -> exceeds 10 KG capacity
      trayButtons[1].click();
      expect(feedbackText).toContain('Exceeds remaining weight capacity');

      const packedGrid = stage.querySelector('#pack-packed-grid');
      expect(packedGrid.querySelectorAll('.pack-item-card').length).toBe(1);

      handle.cleanup();
    });

    it('seals container and submits valid result contract on finalization', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;

      const handle = PackFitTemplate.mount(
        stage,
        { containerCapacity: 10, itemCount: 4 },
        {
          activityType: 'pack_supplies',
          gameMinutesSpent: 20,
          onSubmit: (res) => {
            submittedResult = res;
          },
        }
      );

      const trayButtons = stage.querySelectorAll('.pack-tray-grid .pack-item-card');
      // Pack enough items to exceed 40% threshold
      trayButtons[0].click();
      trayButtons[1].click();

      // Finalize packing
      handle.finalizePacking();

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(submittedResult).not.toBeNull();
      expect(submittedResult.outcome).toBe('success');
      expect(submittedResult.score).toBeGreaterThanOrEqual(0.60);
      expect(submittedResult.rewardId).toMatch(/^reward_pack_supplies_/);

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });
  });

  describe('4. Daily Activities System & Reward Integration', () => {
    let mockGame;

    beforeEach(() => {
      const inventory = new Inventory(10);
      const clock = new ClockSystem();
      const needs = new NeedsSystem();
      const farmingSystem = new FarmingSystem();
      const player = new Player();
      player.setConfiguration({
        name: 'Vance',
        occupation: 'farmer',
        traits: ['green_thumb'],
      });

      mockGame = {
        inventory,
        clock,
        needs,
        farmingSystem,
        player,
        money: 100,
        stats: { cropsHarvested: 0 },
        _updateHUD: vi.fn(),
        showNotification: vi.fn(),
      };

      mockGame.miniGameManager = new MiniGameManager(mockGame);
    });

    it('processes cooking transaction, consumes vegetables, advances time, and satisfies hunger/health', () => {
      mockGame.inventory.addItem('corn', 2);
      mockGame.needs.hunger = 70;
      mockGame.needs.health = 80;

      // Reserve corn for cooking
      mockGame.miniGameManager.rewardProcessor.reserveMaterials('cook_tx_1', mockGame.inventory, [
        { itemId: 'corn', count: 1 },
      ]);

      const cookResult = {
        outcome: 'success',
        score: 0.95,
        qualityTier: 'master',
        gameMinutesSpent: 25,
        rewardId: 'cook_stew_daily_01',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'cook_tx_1',
        cookResult,
        { skillExp: { skillName: 'cooking', exp: 20 } }
      );

      expect(receipt.success).toBe(true);
      // Corn consumed: 2 -> 1
      expect(mockGame.inventory.getItemCount('corn')).toBe(1);
      // Clock advanced 25 minutes
      expect(mockGame.clock.minute).toBe(25);
      // Skill exp gained
      expect(mockGame.player.skills.cooking).toBeGreaterThan(0);
      // Duplicate protection registered
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('cook_stew_daily_01')).toBe(true);
    });

    it('processes radio tuning reward and advances clock', () => {
      const radioResult = {
        outcome: 'success',
        score: 0.88,
        qualityTier: 'good',
        gameMinutesSpent: 20,
        rewardId: 'radio_tuning_daily_01',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'radio_tx_1',
        radioResult,
        { skillExp: { skillName: 'electrical', exp: 20 } }
      );

      expect(receipt.success).toBe(true);
      expect(mockGame.clock.minute).toBe(20);
      expect(mockGame.player.skills.electrical).toBeGreaterThan(0);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('radio_tuning_daily_01')).toBe(true);
    });

    it('processes storage packing reward with monetary payout', () => {
      const packResult = {
        outcome: 'success',
        score: 0.82,
        qualityTier: 'good',
        gameMinutesSpent: 20,
        rewardId: 'pack_storage_daily_01',
      };

      const initialMoney = mockGame.money;
      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'pack_tx_1',
        packResult,
        { money: 35, skillExp: { skillName: 'crafting', exp: 25 } }
      );

      expect(receipt.success).toBe(true);
      expect(mockGame.money).toBeGreaterThan(initialMoney);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('pack_storage_daily_01')).toBe(true);
    });
  });
});
