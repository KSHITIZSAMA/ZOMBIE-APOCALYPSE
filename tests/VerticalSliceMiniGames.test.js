import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimingBarTemplate } from '../src/minigames/templates/TimingBarTemplate.js';
import { ConnectMatchTemplate, DEFAULT_CIRCUIT_PAIRS } from '../src/minigames/templates/ConnectMatchTemplate.js';
import { validateMiniGameResult } from '../src/minigames/contracts.js';
import { DifficultySystem } from '../src/minigames/DifficultySystem.js';
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
      left: 20,
      top: 20,
      right: 120,
      bottom: 60,
      width: 100,
      height: 40,
    };
  }

  get textContent() {
    if (this.children.length === 0) return this._textContent;
    return this.children.map((c) => c.textContent).join('');
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

function parseHTML(html, parent) {
  const elements = [];
  const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>(.*?)<\/\1>|<([a-zA-Z0-9\-]+)([^>]*)\/?>/gis;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1] || match[4];
    const rawAttrs = match[2] || match[5] || '';
    const inner = match[3] || '';

    const el = new MockElement(tagName);
    el.parentNode = parent;

    const attrRegex = /([a-zA-Z0-9\-]+)(?:=["']([^"']*)["'])?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1];
      const attrVal = attrMatch[2] !== undefined ? attrMatch[2] : '';
      if (attrName) el.setAttribute(attrName, attrVal);
    }

    if (inner.trim()) {
      if (inner.includes('<')) {
        el.innerHTML = inner;
      } else {
        el.textContent = inner.trim();
      }
    }

    elements.push(el);
  }
  return elements;
}

MockElement.prototype.querySelector = function (selector) {
  const results = this.querySelectorAll(selector);
  return results.length > 0 ? results[0] : null;
};

MockElement.prototype.querySelectorAll = function (selector) {
  const results = [];
  const matchSelector = (el, sel) => {
    sel = sel.trim();
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

describe('Stage 2 — Vertical Slice Mini-Games', () => {
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

  describe('1. Timing Bar Template (Harvesting & Chopping)', () => {
    it('mounts UI with track, sweet spot target, needle, and attempts counter', () => {
      const stage = new MockElement('div');
      let actionLabel = '';
      let actionCb = null;

      const handle = TimingBarTemplate.mount(
        stage,
        { targetZoneWidth: 32, indicatorSpeed: 240, attempts: 2 },
        {
          activityType: 'harvest',
          gameMinutesSpent: 15,
          onSubmit: vi.fn(),
          onCancel: vi.fn(),
          setActionButton: (label, cb) => {
            actionLabel = label;
            actionCb = cb;
          },
        }
      );

      expect(stage.children.length).toBe(1);
      const container = stage.querySelector('.timing-bar-container');
      expect(container).not.toBeNull();

      const track = stage.querySelector('.timing-track');
      expect(track).not.toBeNull();

      const needle = stage.querySelector('.timing-needle');
      expect(needle).not.toBeNull();

      const attempts = stage.querySelector('#timing-attempts-label');
      expect(attempts).not.toBeNull();
      expect(attempts.textContent).toContain('2/2');

      expect(actionLabel).toContain('Strike');
      expect(typeof actionCb).toBe('function');

      handle.cleanup();
    });

    it('processes sweet spot hit, submits valid contract result, and scores appropriately', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;

      // With wide target zone (48%), strike reliably hits sweet spot
      const handle = TimingBarTemplate.mount(
        stage,
        { targetZoneWidth: 48, indicatorSpeed: 140, attempts: 1 },
        {
          activityType: 'harvest_wheat',
          gameMinutesSpent: 15,
          onSubmit: (res) => {
            submittedResult = res;
          },
          onCancel: vi.fn(),
        }
      );

      expect(typeof handle.triggerStrike).toBe('function');

      // Trigger strike
      handle.triggerStrike();

      // Wait for completion timeout
      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(submittedResult).not.toBeNull();
      expect(['success', 'failure']).toContain(submittedResult.outcome);
      expect(submittedResult.score).toBeGreaterThanOrEqual(0.2);
      expect(submittedResult.score).toBeLessThanOrEqual(1.0);
      expect(submittedResult.gameMinutesSpent).toBe(15);
      expect(submittedResult.rewardId).toMatch(/^reward_harvest_wheat_/);

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });

    it('decrements attempts on complete miss and eventually fails when exhausted', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;
      let feedbackMsg = '';

      const handle = TimingBarTemplate.mount(
        stage,
        { targetZoneWidth: 12, indicatorSpeed: 500, attempts: 2 },
        {
          activityType: 'harvest_corn',
          gameMinutesSpent: 15,
          onSubmit: (res) => {
            submittedResult = res;
          },
          setFeedback: (msg) => {
            feedbackMsg = msg;
          },
        }
      );

      // Force needle to edge (0%) where sweet spot is never placed (minCenter >= 21%)
      const needleEl = stage.querySelector('#timing-needle');
      if (needleEl) needleEl.style.left = '0%';

      // First strike is a miss
      handle.triggerStrike();
      const attemptsLabel = stage.querySelector('#timing-attempts-label');
      expect(attemptsLabel.textContent).toContain('1/2');
      expect(feedbackMsg).toContain('Missed');

      // Second strike exhausts attempts -> failure outcome
      handle.triggerStrike();

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(submittedResult).not.toBeNull();
      expect(submittedResult.outcome).toBe('failure');
      expect(submittedResult.qualityTier).toBe('poor');
      expect(submittedResult.score).toBeLessThan(0.40);

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });
  });

  describe('2. Connect and Match Template (Electrical Circuits)', () => {
    it('mounts circuit board with left and right terminals and wire SVG', () => {
      const stage = new MockElement('div');
      const handle = ConnectMatchTemplate.mount(
        stage,
        { pairCount: 4, allowedMistakes: 2 },
        {
          activityType: 'circuit_repair',
          gameMinutesSpent: 20,
          onSubmit: vi.fn(),
          onCancel: vi.fn(),
        }
      );

      const board = stage.querySelector('.connect-match-board');
      expect(board).not.toBeNull();

      const leftNodes = stage.querySelectorAll('.terminal-node-left');
      const rightNodes = stage.querySelectorAll('.terminal-node-right');
      expect(leftNodes.length).toBe(4);
      expect(rightNodes.length).toBe(4);

      const svg = stage.querySelector('#circuit-wires-svg');
      expect(svg).not.toBeNull();

      handle.cleanup();
    });

    it('successfully connects matching terminals and triggers victory upon wiring all circuits', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;
      let progressReport = null;

      const testPairs = [
        { id: 'wire_a', leftLabel: 'Alpha Input', rightLabel: 'Alpha Bus', color: '#ff0000' },
        { id: 'wire_b', leftLabel: 'Beta Input', rightLabel: 'Beta Bus', color: '#00ff00' },
        { id: 'wire_c', leftLabel: 'Gamma Input', rightLabel: 'Gamma Bus', color: '#0000ff' },
      ];

      const handle = ConnectMatchTemplate.mount(
        stage,
        { pairCount: 3, allowedMistakes: 2 },
        {
          activityType: 'circuit_repair',
          pairs: testPairs,
          gameMinutesSpent: 20,
          onSubmit: (res) => {
            submittedResult = res;
          },
          setProgress: (pct, label) => {
            progressReport = { pct, label };
          },
        }
      );

      // Connect pair wire_a
      const leftA = stage.querySelector('.terminal-node-left[data-id="wire_a"]');
      const rightA = stage.querySelector('.terminal-node-right[data-id="wire_a"]');
      leftA.click();
      rightA.click();
      expect(leftA.classList.contains('connected')).toBe(true);
      expect(rightA.classList.contains('connected')).toBe(true);

      // Connect pair wire_b
      const leftB = stage.querySelector('.terminal-node-left[data-id="wire_b"]');
      const rightB = stage.querySelector('.terminal-node-right[data-id="wire_b"]');
      leftB.click();
      rightB.click();

      // Connect pair wire_c (all done)
      const leftC = stage.querySelector('.terminal-node-left[data-id="wire_c"]');
      const rightC = stage.querySelector('.terminal-node-right[data-id="wire_c"]');
      leftC.click();
      rightC.click();

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(submittedResult).not.toBeNull();
      expect(submittedResult.outcome).toBe('success');
      expect(submittedResult.score).toBeGreaterThanOrEqual(0.9);
      expect(submittedResult.qualityTier).toBe('master');
      expect(progressReport.pct).toBe(100);

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });

    it('penalizes incorrect connections and fails when allowed mistakes are exceeded', async () => {
      const stage = new MockElement('div');
      let submittedResult = null;
      let feedback = '';

      const testPairs = [
        { id: 'wire_1', leftLabel: 'Wire 1 In', rightLabel: 'Wire 1 Out', color: '#ff0000' },
        { id: 'wire_2', leftLabel: 'Wire 2 In', rightLabel: 'Wire 2 Out', color: '#00ff00' },
        { id: 'wire_3', leftLabel: 'Wire 3 In', rightLabel: 'Wire 3 Out', color: '#0000ff' },
      ];

      const handle = ConnectMatchTemplate.mount(
        stage,
        { pairCount: 3, allowedMistakes: 1 },
        {
          activityType: 'circuit_repair',
          pairs: testPairs,
          gameMinutesSpent: 20,
          onSubmit: (res) => {
            submittedResult = res;
          },
          setFeedback: (msg) => {
            feedback = msg;
          },
        }
      );

      // Try wrong match: left wire_1 to right wire_2
      const left1 = stage.querySelector('.terminal-node-left[data-id="wire_1"]');
      const right2 = stage.querySelector('.terminal-node-right[data-id="wire_2"]');

      left1.click();
      right2.click();

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(feedback).toContain('blown');
      expect(submittedResult).not.toBeNull();
      expect(submittedResult.outcome).toBe('failure');
      expect(submittedResult.qualityTier).toBe('poor');

      const validation = validateMiniGameResult(submittedResult);
      expect(validation.valid).toBe(true);

      handle.cleanup();
    });
  });

  describe('3. Core Game & System Integration', () => {
    let mockGame;

    beforeEach(() => {
      const inventory = new Inventory(10);
      const clock = new ClockSystem();
      const needs = new NeedsSystem();
      const farmingSystem = new FarmingSystem();
      const player = new Player();
      player.setConfiguration({
        name: 'Vance',
        occupation: 'electrician',
        traits: ['green_thumb'],
      });

      mockGame = {
        inventory,
        clock,
        needs,
        farmingSystem,
        player,
        money: 150,
        stats: { cropsHarvested: 0 },
        _updateHUD: vi.fn(),
        showNotification: vi.fn(),
      };

      mockGame.miniGameManager = new MiniGameManager(mockGame);
    });

    it('routes mature garden plot harvest into mini-game reward processing', () => {
      // Plant and mature a crop in plot 0
      mockGame.inventory.addItem('corn_seed', 1);
      mockGame.farmingSystem.plantSeed('corn_seed', mockGame.inventory, mockGame.player, 0);
      const plot = mockGame.farmingSystem.getPlot(0);
      plot.state = 'mature';

      const initialCorn = mockGame.inventory.getItemCount('corn');
      const initialClockMinute = mockGame.clock.minute;

      // Simulate harvest mini-game completion via RewardProcessor
      const miniGameResult = {
        outcome: 'success',
        score: 0.92,
        qualityTier: 'master',
        gameMinutesSpent: 15,
        rewardId: 'harvest_plot_0_stage2_test',
      };

      const rewardDef = {
        items: [{ itemId: 'corn', count: 2 }],
        skillExp: { skillName: 'farming', exp: 20 },
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'harvest_tx_0',
        miniGameResult,
        rewardDef
      );

      expect(receipt.success).toBe(true);
      expect(receipt.qualityTier).toBe('master');
      // Master tier multiplies items by 1.3x (2 * 1.30 = 2.6 -> 3 corn)
      expect(mockGame.inventory.getItemCount('corn')).toBe(initialCorn + 3);
      expect(mockGame.clock.minute).toBe(initialClockMinute + 15);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('harvest_plot_0_stage2_test')).toBe(true);
    });

    it('routes electrical job and breaker panel through circuit diagnostic activity', () => {
      const elecJob = {
        id: 'electrical_repair',
        name: 'Electrical Repair',
        durationHours: 3,
        fatigueCost: 25,
        getReward: () => 65,
      };

      const initialMoney = mockGame.money;

      const circuitResult = {
        outcome: 'success',
        score: 0.88,
        qualityTier: 'good',
        gameMinutesSpent: 180,
        rewardId: 'circuit_repair_job_stage2_test',
      };

      const receipt = mockGame.miniGameManager.rewardProcessor.processResult(
        mockGame,
        'circuit_tx_job',
        circuitResult,
        {
          money: elecJob.getReward(),
          skillExp: { skillName: 'electrical', exp: 25 },
        }
      );

      expect(receipt.success).toBe(true);
      expect(mockGame.money).toBeGreaterThan(initialMoney);
      expect(mockGame.miniGameManager.rewardProcessor.hasRewardBeenProcessed('circuit_repair_job_stage2_test')).toBe(true);
    });
  });
});
