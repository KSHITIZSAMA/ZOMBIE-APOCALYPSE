/**
 * Game — Main game orchestrator.
 * Coordinates character creation, scene transitions, survival needs,
 * inventory, farming, narrative story events, sleep protection, and save/load.
 */

import { GameLoop } from './GameLoop.js';
import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { ClockSystem } from './ClockSystem.js';
import { Renderer } from '../render/Renderer.js';
import { Player } from '../entities/Player.js';
import { SceneManager, SceneType } from './SceneManager.js';
import { NeedsSystem } from './NeedsSystem.js';
import { Inventory } from './Inventory.js';
import { FarmingSystem } from './FarmingSystem.js';
import { EventManager } from './EventManager.js';
import { SaveSystem } from './SaveSystem.js';
import { CharacterCreator } from '../ui/CharacterCreator.js';
import { ShopModal } from '../ui/ShopModal.js';
import { InventoryModal } from '../ui/InventoryModal.js';
import { JobsModal } from '../ui/JobsModal.js';
import { PlantingModal } from '../ui/PlantingModal.js';
import { DialogueModal } from '../ui/DialogueModal.js';
import { createRNG, generateSeed } from '../utils/rng.js';
import { Zombie } from '../entities/Zombie.js';
import { SoundSystem } from '../audio/SoundSystem.js';
import { getOccupation } from '../data/occupations.js';
import { getStoryEvent } from '../data/events.js';
import { MiniGameManager } from '../minigames/MiniGameManager.js';
import { getItem } from '../data/items.js';
import { BALANCE } from '../data/balance.js';

/** @enum {string} Game states */
export const GameState = {
  TITLE: 'title',
  CREATOR: 'creator',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

export class Game {
  constructor() {
    /** @type {HTMLCanvasElement} */
    this.canvas = document.getElementById('game-canvas');

    /** @type {GameState} */
    this.state = GameState.TITLE;

    // Core systems
    this.input = new Input();
    this.clock = new ClockSystem();
    this.sound = new SoundSystem();
    this.renderer = new Renderer(this.canvas);
    this.player = new Player();
    this.camera = null;
    this.rng = null;

    // Life Simulation & Mini-Game systems
    this.needs = new NeedsSystem();
    this.inventory = new Inventory(BALANCE.INVENTORY_CAPACITY);
    this.farmingSystem = new FarmingSystem();
    this.miniGameManager = new MiniGameManager(this);

    // Story, Outbreak & Combat systems
    this.eventManager = new EventManager();
    this.worldStage = 'normal';
    this.baseDefenseLevel = 0;
    this.doorBarricadeLevel = 0;
    this.neighborReputation = 0;

    // Escape Utility Truck Status
    this.truckState = {
      battery: false,
      fuel: false,
      engineRepaired: false,
    };

    /** @type {Zombie[]} Active zombies */
    this.zombies = [];
    this.zombieSpawnTimer = 5;
    this.damageFlashTimer = 0;

    /** @type {{ zombiesDefeated: number, cropsHarvested: number, damageDealt: number, damageTaken: number }} */
    this.stats = {
      zombiesDefeated: 0,
      cropsHarvested: 0,
      damageDealt: 0,
      damageTaken: 0,
    };

    /** @type {number} Player cash */
    this.money = 500;

    /** @type {number} Total real-time seconds elapsed during gameplay */
    this.gameTime = 0;

    // Active modal tracker
    this._activeModal = null;

    // Scene manager with notification callback
    this.sceneManager = new SceneManager({
      onNotification: (text) => this.showNotification(text),
    });
    this._setupSceneObjects();

    // DOM references
    this._container = document.getElementById('game-container');
    this._titleScreen = document.getElementById('title-screen');
    this._pauseOverlay = document.getElementById('pause-overlay');
    this._btnContinue = document.getElementById('btn-continue-game');
    this._hud = document.getElementById('hud');
    this._btnHudAudio = document.getElementById('btn-hud-audio');
    this._hudDay = document.getElementById('hud-day');
    this._hudTime = document.getElementById('hud-time');
    this._hudMoney = document.getElementById('hud-money');
    this._hudLocation = document.getElementById('hud-location');
    this._hudName = document.getElementById('hud-name');
    this._toast = document.getElementById('notification-toast');
    this._toastTimer = null;

    // Needs meter bars
    this._meterHealth = document.getElementById('meter-health');
    this._meterHunger = document.getElementById('meter-hunger');
    this._meterThirst = document.getElementById('meter-thirst');
    this._meterFatigue = document.getElementById('meter-fatigue');

    // Game Over DOM elements
    this._gameOverScreen = document.getElementById('game-over-screen');
    this._gameOverCause = document.getElementById('game-over-cause');
    this._statDays = document.getElementById('stat-days');
    this._statTime = document.getElementById('stat-time');
    this._statZombies = document.getElementById('stat-zombies');
    this._statWarnings = document.getElementById('stat-warnings');
    this._statCrops = document.getElementById('stat-crops');

    // Victory DOM elements
    this._victoryScreen = document.getElementById('victory-screen');
    this._vstatDays = document.getElementById('vstat-days');
    this._vstatTime = document.getElementById('vstat-time');
    this._vstatZombies = document.getElementById('vstat-zombies');
    this._vstatMoney = document.getElementById('vstat-money');
    this._vstatCrops = document.getElementById('vstat-crops');
    this._vCompanionText = document.getElementById('victory-companion-text');
    this._vNarrative = document.getElementById('victory-narrative');
    this._btnVictoryRestart = document.getElementById('btn-victory-restart');
    this._btnVictoryTitle = document.getElementById('btn-victory-title');

    // Game loop
    this._loop = new GameLoop(
      (dt) => this._update(dt),
      () => this._render()
    );

    this._setupUI();
    this.input.attach();
  }

  /**
   * Configure interactive objects on the Ranch Exterior and Farmhouse Interior.
   * @private
   */
  _setupSceneObjects() {
    // 1. Exterior Scene Objects
    this.sceneManager.scenes[SceneType.EXTERIOR].interactiveObjects = [
      {
        id: 'door_barricade',
        x: 1375,
        width: 44,
        label: 'Reinforce Door Barricade (2 Planks)',
        action: () => this.reinforceDoorBarricade(),
      },
      {
        id: 'house_door',
        x: 1418,
        width: 44,
        label: 'Enter Farmhouse',
        action: () => {
          this.sceneManager.transitionTo(SceneType.INTERIOR, 120, (scene, spawnX) => {
            this.player.x = spawnX;
            this.player.y = scene.groundY;
            if (this.camera) this.camera.snapTo(this.player.x, scene.worldWidth);
          });
        },
      },
      {
        id: 'neighbor_caleb',
        x: 750,
        width: 45,
        label: 'Talk with Caleb Miller',
        action: () => {
          // Check if Caleb request event is due or trigger neighbor chat
          const dueEvent = this.eventManager.getDueEvent(this.clock.day, this.clock.hour);
          if (dueEvent && dueEvent.id === 'neighbor_caleb_request') {
            this.triggerEvent(dueEvent.id);
          } else {
            this.showNotification('Caleb: "Keep your fences tight, neighbor. Things have been strange over in the valley."');
          }
        },
      },
      {
        id: 'shop',
        x: 1060,
        width: 75,
        label: 'Visit County Store',
        action: () => this.openShop(),
      },
      {
        id: 'mailbox',
        x: 1180,
        width: 30,
        label: 'Check Mailbox',
        action: () => {
          const due = this.eventManager.getDueEvent(this.clock.day, this.clock.hour);
          if (due) {
            this.triggerEvent(due.id);
          } else {
            this.showNotification('Mailbox: "Valley Gazette delivery. Distant sirens can be heard down Route 9."');
          }
        },
      },
      {
        id: 'well',
        x: 1705,
        width: 50,
        label: 'Draw Fresh Water',
        action: () => {
          if (!this.inventory.canAccept('water_bottle', 1)) {
            this.showNotification('Inventory full! Free up a slot to hold water.');
            return;
          }
          this.inventory.addItem('water_bottle', 1);
          this.needs.thirst = Math.max(0, this.needs.thirst - 15);
          this.sound.playWater();
          this.showNotification('Drew a clean bottle of fresh groundwater (+1 Water Bottle).');
        },
      },
      {
        id: 'garden',
        x: 1890,
        width: 130,
        label: 'Tend Garden Soil',
        action: () => {
          const plot = this.farmingSystem.getPlot(0);
          if (plot.state === 'tilled') {
            this.openPlanting();
          } else if (plot.state === 'growing') {
            if (!plot.isWatered) {
              const res = this.farmingSystem.waterPlot(0);
              this.sound.playWater();
              this.showNotification(res.message);
            } else {
              const remainingHours = Math.max(0, Math.round(plot.requiredHours - plot.growthHours));
              this.showNotification(`${plot.cropName} is growing well (~${remainingHours}h until harvest).`);
            }
          } else if (plot.state === 'mature') {
            this.startHarvestMiniGame(0);
          }
        },
      },
      {
        id: 'wood_pile',
        x: 2060,
        width: 60,
        label: 'Gather Timber Planks',
        action: () => {
          if (!this.inventory.canAccept('wood', 2)) {
            this.showNotification('Inventory full! Free up space first.');
            return;
          }
          this.clock.advanceHours(1);
          this.needs.advanceHours(1, this.player.traits);
          this.needs.fatigue = Math.min(100, this.needs.fatigue + 10);
          this.inventory.addItem('wood', 2);
          this.sound.playHammer();
          this.showNotification('Gathered 2x Timber Planks (1 hour elapsed).');
        },
      },
      {
        id: 'escape_truck',
        x: 2360,
        width: 130,
        label: 'Inspect Utility Truck',
        action: () => this.interactWithTruck(),
      },
    ];

    // 2. Interior Scene Objects
    this.sceneManager.scenes[SceneType.INTERIOR].interactiveObjects = [
      {
        id: 'exit_door',
        x: 120,
        width: 44,
        label: 'Exit to Ranch',
        action: () => {
          this.sceneManager.transitionTo(SceneType.EXTERIOR, 1420, (scene, spawnX) => {
            this.player.x = spawnX;
            this.player.y = scene.groundY;
            if (this.camera) this.camera.snapTo(this.player.x, scene.worldWidth);
          });
        },
      },
      {
        id: 'storage_chest',
        x: 175,
        width: 44,
        label: 'Organize Supply Trunk',
        action: () => this.startPackingMiniGame(),
      },
      {
        id: 'table',
        x: 280,
        width: 70,
        label: 'Daily Work & Contracts',
        action: () => this.openJobs(),
      },
      {
        id: 'radio',
        x: 295,
        width: 32,
        label: 'Tune Shortwave Radio',
        action: () => this.startRadioTuningMiniGame(),
      },
      {
        id: 'stove',
        x: 355,
        width: 44,
        label: 'Cook Country Stew',
        action: () => this.startCookingMiniGame(),
      },
      {
        id: 'fireplace',
        x: 460,
        width: 80,
        label: 'Warm Fireplace',
        action: () => {
          this.needs.health = Math.min(100, this.needs.health + 5);
          this.showNotification('The gentle crackle and radiant heat comfort you.');
        },
      },
      {
        id: 'breaker_panel',
        x: 655,
        width: 50,
        label: 'Service Electrical Fuse Box',
        action: () => this.startCircuitRepairMiniGame('interior_fuse_box'),
      },
      {
        id: 'bed',
        x: 775,
        width: 90,
        label: 'Sleep (Rest 8 Hours)',
        action: () => this.sleep(8),
      },
    ];
  }

  /**
   * Setup UI event handlers and save/load connections.
   * @private
   */
  _setupUI() {
    // Check for existing save on launch
    this._checkContinueButton();

    // New Game button opens Character Creator
    document.getElementById('btn-new-game').addEventListener('click', () => {
      this.openCharacterCreator();
    });

    // Continue Run button
    if (this._btnContinue) {
      this._btnContinue.addEventListener('click', () => {
        this.loadGame();
      });
    }

    // Resume button
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.resumeGame();
    });

    // Save Game button in pause overlay
    const saveBtn = document.getElementById('btn-save-game');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const res = SaveSystem.save(this);
        this.showNotification(res.message);
        this._checkContinueButton();
      });
    }

    // Load Game button in pause overlay
    const loadBtn = document.getElementById('btn-load-game');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.loadGame();
      });
    }

    // Return to Title button
    const titleBtn = document.getElementById('btn-title-return');
    if (titleBtn) {
      titleBtn.addEventListener('click', () => {
        this.state = GameState.TITLE;
        this._pauseOverlay.classList.add('hidden');
        this._hud.classList.add('hidden');
        this._titleScreen.classList.remove('hidden');
        this._checkContinueButton();
      });
    }

    // Pack button on HUD
    const hudInvBtn = document.getElementById('btn-hud-inv');
    if (hudInvBtn) {
      hudInvBtn.addEventListener('click', () => {
        this.toggleInventory();
      });
    }

    // Game Over Restart button
    const restartBtn = document.getElementById('btn-restart-game');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this._gameOverScreen) this._gameOverScreen.classList.add('hidden');
        this.openCharacterCreator();
      });
    }

    // Game Over Return to Title button
    const goTitleBtn = document.getElementById('btn-gameover-title');
    if (goTitleBtn) {
      goTitleBtn.addEventListener('click', () => {
        if (this._gameOverScreen) this._gameOverScreen.classList.add('hidden');
        this.state = GameState.TITLE;
        this._hud.classList.add('hidden');
        this._titleScreen.classList.remove('hidden');
        this._checkContinueButton();
      });
    }

    // Audio Mute toggle button on HUD
    if (this._btnHudAudio) {
      this._btnHudAudio.textContent = this.sound.muted ? '🔇' : '🔊';
      this._btnHudAudio.addEventListener('click', () => {
        const isMuted = this.sound.toggleMute();
        this._btnHudAudio.textContent = isMuted ? '🔇' : '🔊';
        this.showNotification(isMuted ? 'Audio muted.' : 'Audio unmuted.');
      });
    }

    // Victory Restart button
    if (this._btnVictoryRestart) {
      this._btnVictoryRestart.addEventListener('click', () => {
        if (this._victoryScreen) this._victoryScreen.classList.add('hidden');
        this.openCharacterCreator();
      });
    }

    // Victory Return to Title button
    if (this._btnVictoryTitle) {
      this._btnVictoryTitle.addEventListener('click', () => {
        if (this._victoryScreen) this._victoryScreen.classList.add('hidden');
        this.state = GameState.TITLE;
        this._hud.classList.add('hidden');
        this._titleScreen.classList.remove('hidden');
        this._checkContinueButton();
      });
    }

    // Dev debug panel
    if (import.meta.env.DEV) {
      import('../ui/DebugPanel.js').then(({ setupDebugPanel }) => {
        setupDebugPanel(this);
      });
    }
  }

  /**
   * Refresh continue button visibility on title screen.
   * @private
   */
  _checkContinueButton() {
    if (this._btnContinue) {
      if (SaveSystem.hasSave()) {
        const summary = SaveSystem.getSaveSummary();
        this._btnContinue.classList.remove('hidden');
        if (summary) {
          this._btnContinue.textContent = `Continue (${summary.playerName} — Day ${summary.day})`;
        }
      } else {
        this._btnContinue.classList.add('hidden');
      }
    }
  }

  /**
   * Open Character Creator modal.
   */
  openCharacterCreator() {
    this.state = GameState.CREATOR;
    this._titleScreen.classList.add('hidden');

    const creator = new CharacterCreator(
      this._container,
      (characterData) => {
        this.startNewGame(characterData);
      },
      () => {
        this.state = GameState.TITLE;
        this._titleScreen.classList.remove('hidden');
        this._checkContinueButton();
      }
    );

    creator.open();
  }

  /**
   * Start a new game with the configured survivor.
   * @param {object} [characterData]
   */
  startNewGame(characterData = null) {
    const seed = generateSeed();
    this.rng = createRNG(seed);

    // Reset clock and time
    this.clock = new ClockSystem();
    this.gameTime = 0;

    // Reset needs, inventory, farming, and event manager
    this.needs = new NeedsSystem();
    this.inventory = new Inventory(BALANCE.INVENTORY_CAPACITY);
    this.farmingSystem = new FarmingSystem();
    this.miniGameManager = new MiniGameManager(this);
    this.eventManager = new EventManager(this.rng);
    this.worldStage = 'normal';
    this.baseDefenseLevel = 0;
    this.doorBarricadeLevel = 0;
    this.neighborReputation = 0;
    this.truckState = {
      battery: false,
      fuel: false,
      engineRepaired: false,
    };
    this.zombies = [];
    this.damageFlashTimer = 0;
    this.stats = {
      zombiesDefeated: 0,
      cropsHarvested: 0,
      damageDealt: 0,
      damageTaken: 0,
    };
    if (this._gameOverScreen) this._gameOverScreen.classList.add('hidden');
    if (this._victoryScreen) this._victoryScreen.classList.add('hidden');

    // Reset player with customization
    this.player = new Player();
    if (characterData) {
      this.player.setConfiguration(characterData);
      const occ = getOccupation(characterData.occupation);
      this.money = occ?.startingMoney ?? 500;

      if (characterData.occupation === 'farmer') {
        this.inventory.addItem('corn_seed', 3);
        this.inventory.addItem('tomato_seed', 2);
        this.inventory.addItem('canned_food', 2);
        this.inventory.addItem('water_bottle', 3);
      } else if (characterData.occupation === 'electrician') {
        this.inventory.addItem('canned_food', 3);
        this.inventory.addItem('water_bottle', 2);
        this.inventory.addItem('wood', 4);
      } else {
        this.inventory.addItem('bread', 3);
        this.inventory.addItem('water_bottle', 3);
        this.inventory.addItem('canned_food', 1);
      }
    } else {
      this.money = 500;
      this.inventory.addItem('canned_food', 2);
      this.inventory.addItem('water_bottle', 2);
      this.inventory.addItem('corn_seed', 2);
    }

    // Reset scene to Ranch Exterior
    this.sceneManager.currentScene = SceneType.EXTERIOR;
    const scene = this.sceneManager.getCurrentSceneConfig();
    this.player.x = scene.spawnX;
    this.player.y = scene.groundY;

    // Initialize camera
    const size = this.renderer.getLogicalSize();
    this.camera = new Camera(size.width, size.height);
    this.camera.snapTo(this.player.x, scene.worldWidth);

    this.renderer.init(this.rng);

    // Transition to playing state
    this.state = GameState.PLAYING;
    this._titleScreen.classList.add('hidden');
    this._hud.classList.remove('hidden');
    this._pauseOverlay.classList.add('hidden');

    this._updateHUD();

    this._loop.start();
  }

  /**
   * Load saved run.
   */
  loadGame() {
    // Initialize blank systems if loading directly from title
    if (!this.camera) {
      const size = this.renderer.getLogicalSize();
      this.camera = new Camera(size.width, size.height);
    }

    const res = SaveSystem.load(this);
    if (res.success) {
      this.state = GameState.PLAYING;
      this._titleScreen.classList.add('hidden');
      this._hud.classList.remove('hidden');
      this._pauseOverlay.classList.add('hidden');
      this._loop.start();
      this.showNotification('Saved run loaded successfully.');
    } else {
      this.showNotification(res.message);
    }
  }

  /**
   * Trigger and display a narrative story event.
   * @param {string} eventId
   */
  triggerEvent(eventId) {
    if (this._activeModal) {
      this._activeModal.close();
      this._activeModal = null;
    }

    const eventDef = getStoryEvent(eventId);
    if (!eventDef) return;

    this._activeModal = new DialogueModal(this._container, eventDef, this, (choiceId) => {
      const res = this.eventManager.resolveEvent(eventId, choiceId, this);
      this._updateHUD();
      return res;
    });

    this._activeModal.open();
  }

  /**
   * Open General Store modal.
   */
  openShop() {
    if (this._activeModal) this._activeModal.close();

    this._activeModal = new ShopModal(this._container, {
      inventory: this.inventory,
      getMoney: () => this.money,
      setMoney: (val) => {
        const diff = val - this.money;
        this.money = val;
        this._updateHUD();
        if (diff !== 0) this.sound.playCash();
      },
      onToast: (msg) => this.showNotification(msg),
      onClose: () => {
        this._activeModal = null;
      },
    });

    this._activeModal.open();
  }

  /**
   * Toggle Inventory modal.
   */
  toggleInventory() {
    if (this._activeModal instanceof InventoryModal) {
      this._activeModal.close();
      this._activeModal = null;
      return;
    }

    if (this._activeModal) this._activeModal.close();

    this._activeModal = new InventoryModal(this._container, {
      inventory: this.inventory,
      needs: this.needs,
      onToast: (msg) => this.showNotification(msg),
      onClose: () => {
        this._activeModal = null;
      },
    });

    this._activeModal.open();
  }

  /**
   * Open Jobs board.
   */
  openJobs() {
    if (this._activeModal) this._activeModal.close();

    this._activeModal = new JobsModal(this._container, {
      player: this.player,
      needs: this.needs,
      onWorkJob: (job) => this.workJob(job),
      onClose: () => {
        this._activeModal = null;
      },
    });

    this._activeModal.open();
  }

  /**
   * Open Planting seeds selector.
   */
  openPlanting() {
    if (this._activeModal) this._activeModal.close();

    this._activeModal = new PlantingModal(this._container, {
      inventory: this.inventory,
      onPlantSeed: (seedId) => {
        const res = this.farmingSystem.plantSeed(seedId, this.inventory, this.player, 0);
        this.showNotification(res.message);
      },
      onClose: () => {
        this._activeModal = null;
      },
    });

    this._activeModal.open();
  }

  /**
   * Perform a work shift.
   * @param {object} job
   */
  workJob(job) {
    if (this._activeModal) {
      this._activeModal.close();
      this._activeModal = null;
    }

    if (job.mechanic) {
      this.startJobMiniGame(job);
      return;
    }

    const fadeEl = document.getElementById('screen-fade');
    if (fadeEl) fadeEl.classList.add('active');

    setTimeout(() => {
      this.clock.advanceHours(job.durationHours);
      this.needs.advanceHours(job.durationHours, this.player.traits);
      this.needs.fatigue = Math.min(100, this.needs.fatigue + job.fatigueCost);
      this.farmingSystem.advanceHours(job.durationHours);

      const pay = job.getReward(this.player);
      this.money += pay;
      this.sound.playCash();
      this._updateHUD();

      setTimeout(() => {
        if (fadeEl) fadeEl.classList.remove('active');
        this.showNotification(`Completed shift: ${job.title}. Earned +$${pay}.`);
      }, 300);
    }, 350);
  }

  /**
   * Launch mini-game corresponding to an employment contract.
   * @param {object} job
   */
  startJobMiniGame(job) {
    if (job.mechanic === 'connect_match') {
      this.startCircuitRepairMiniGame(job.id, job);
      return;
    }

    const skillLevel = this.player?.skills?.[job.skill] || 15;
    const isSpecialist = job.requiredOccupation && this.player?.occupation === job.requiredOccupation;
    const baseReward = job.getReward(this.player);
    const durationMinutes = job.durationHours * 60;

    const baseConfig = {
      type: job.id,
      mechanic: job.mechanic,
      title: job.title,
      subtitle: `Employment Contract — ${job.durationHours}h Shift`,
      instructions: job.description,
      baseDifficulty: 0.45,
      skillLevel,
      toolBonus: isSpecialist ? 0.15 : 0,
      gameMinutesSpent: durationMinutes,
      requiredMaterials: [],
      rewardDefinition: {
        money: baseReward,
        skillExp: { skillName: job.skill || 'crafting', exp: 25 },
      },
    };

    if (job.mechanic === 'timing_bar') {
      import('../minigames/templates/TimingBarTemplate.js').then(({ TimingBarTemplate }) => {
        this.miniGameManager.launchActivity(baseConfig, (stageEl, derivedParams, submitFn, cancelFn) => {
          TimingBarTemplate.mount(stageEl, derivedParams, {
            activityType: job.id,
            gameMinutesSpent: durationMinutes,
            onSubmit: (result) => this._handleJobMiniGameResult(job, result, submitFn),
            onCancel: cancelFn,
            setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
            setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
            setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
          });
        });
      });
    } else if (job.mechanic === 'ordered_sequence') {
      const customSteps = job.id === 'freelance_article'
        ? [
            { id: 'rumors', label: '1. Sift Regional Rumors', icon: '🎙️', tip: 'Gather field reports' },
            { id: 'draft', label: '2. Draft Manuscript', icon: '📝', tip: 'Compose editorial thesis' },
            { id: 'verify', label: '3. Fact-Check Wire Dispatches', icon: '📰', tip: 'Verify official statements' },
            { id: 'publish', label: '4. Print Broadsheet Column', icon: '🖨️', tip: 'Typeset and distribute' },
          ]
        : [
            { id: 'clean', label: '1. Cleanse Trauma Wound', icon: '🧴', tip: 'Irrigate with saline' },
            { id: 'antiseptic', label: '2. Apply Antiseptic', icon: '🧪', tip: 'Prevent bacterial spread' },
            { id: 'suture', label: '3. Suture Deep Cut', icon: '🪡', tip: 'Close open incision' },
            { id: 'bandage', label: '4. Wrap Sterile Bandage', icon: '🩹', tip: 'Seal against infection' },
          ];

      import('../minigames/templates/OrderedSequenceTemplate.js').then(({ OrderedSequenceTemplate }) => {
        this.miniGameManager.launchActivity(baseConfig, (stageEl, derivedParams, submitFn, cancelFn) => {
          OrderedSequenceTemplate.mount(stageEl, derivedParams, {
            activityType: job.id,
            steps: customSteps,
            gameMinutesSpent: durationMinutes,
            onSubmit: (result) => this._handleJobMiniGameResult(job, result, submitFn),
            onCancel: cancelFn,
            setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
            setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
            setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
          });
        });
      });
    } else if (job.mechanic === 'grid_selection') {
      import('../minigames/templates/GridSelectionTemplate.js').then(({ GridSelectionTemplate }) => {
        this.miniGameManager.launchActivity(baseConfig, (stageEl, derivedParams, submitFn, cancelFn) => {
          GridSelectionTemplate.mount(stageEl, derivedParams, {
            activityType: job.id,
            gameMinutesSpent: durationMinutes,
            onSubmit: (result) => this._handleJobMiniGameResult(job, result, submitFn),
            onCancel: cancelFn,
            setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
            setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
            setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
          });
        });
      });
    } else if (job.mechanic === 'pack_fit') {
      import('../minigames/templates/PackFitTemplate.js').then(({ PackFitTemplate }) => {
        this.miniGameManager.launchActivity(baseConfig, (stageEl, derivedParams, submitFn, cancelFn) => {
          PackFitTemplate.mount(stageEl, derivedParams, {
            activityType: job.id,
            gameMinutesSpent: durationMinutes,
            onSubmit: (result) => this._handleJobMiniGameResult(job, result, submitFn),
            onCancel: cancelFn,
            setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
            setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
            setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
          });
        });
      });
    }
  }

  /**
   * Common handler for employment mini-game completion.
   * @private
   */
  _handleJobMiniGameResult(job, result, submitFn) {
    const receipt = submitFn(result);
    if (receipt.success && receipt.outcome === 'success') {
      this.needs.fatigue = Math.min(100, this.needs.fatigue + job.fatigueCost);
      if (this.sound) this.sound.playCash();
      const earned = receipt.grantedRewards?.money || job.getReward(this.player);
      this.showNotification(`Contract fulfilled: ${job.title}! Payout: +$${earned} (${receipt.qualityTier.toUpperCase()} tier).`);
    } else if (receipt.outcome === 'failure') {
      this.needs.fatigue = Math.min(100, this.needs.fatigue + Math.round(job.fatigueCost / 2));
      this.showNotification(`Contract incomplete: ${job.title}. Work shift concluded prematurely.`);
    }
  }

  /**
   * Launch Harvest Timing Bar mini-game.
   * @param {number} [plotIndex=0]
   */
  startHarvestMiniGame(plotIndex = 0) {
    const plot = this.farmingSystem.getPlot(plotIndex);
    if (!plot || plot.state !== 'mature') return;

    const cropDef = getItem(plot.cropId);
    const cropName = cropDef?.name || plot.cropName || 'Crop';
    const baseYield = plot.yieldCount || 2;
    const farmingSkill = this.player?.skills?.farming || 0;

    import('../minigames/templates/TimingBarTemplate.js').then(({ TimingBarTemplate }) => {
      this.miniGameManager.launchActivity({
        type: 'harvest',
        mechanic: 'timing_bar',
        title: `Harvesting ${cropName}`,
        subtitle: 'Agriculture — Ranch Garden',
        instructions: 'Press SPACE or click STRIKE when the sickle needle aligns inside the green sweet spot.',
        baseDifficulty: 0.45,
        skillLevel: farmingSkill,
        toolBonus: this.player?.occupation === 'farmer' ? 0.10 : 0,
        gameMinutesSpent: 15,
        requiredMaterials: [],
        rewardDefinition: {
          items: [{ itemId: plot.cropId, count: baseYield }],
          skillExp: { skillName: 'farming', exp: 20 },
        },
      }, (stageEl, derivedParams, submitFn, cancelFn) => {
        TimingBarTemplate.mount(stageEl, derivedParams, {
          activityType: 'harvest',
          gameMinutesSpent: 15,
          onSubmit: (result) => {
            const receipt = submitFn(result);
            if (receipt.success && receipt.outcome === 'success') {
              plot.state = 'tilled';
              plot.cropId = null;
              plot.cropName = null;
              plot.growthHours = 0;
              plot.isWatered = false;
              const count = receipt.grantedRewards?.items?.[0]?.count || baseYield;
              this.stats.cropsHarvested += count;
              if (this.sound) this.sound.playClick();
              this.showNotification(`Harvest complete! Collected ${count}x ${cropName} (${receipt.qualityTier.toUpperCase()} quality).`);
            } else if (receipt.outcome === 'failure') {
              plot.state = 'tilled';
              plot.cropId = null;
              plot.cropName = null;
              plot.growthHours = 0;
              plot.isWatered = false;
              this.inventory.addItem(plot.cropId, 1);
              this.stats.cropsHarvested += 1;
              this.showNotification(`Harvest missed sweet spot. Salvaged 1x ${cropName}.`);
            }
          },
          onCancel: cancelFn,
          setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
          setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
          setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
        });
      });
    });
  }

  /**
   * Launch Electrical Circuit Repair Connect & Match mini-game.
   * @param {string} [contextId='fuse_box']
   * @param {object} [job=null]
   */
  startCircuitRepairMiniGame(contextId = 'fuse_box', job = null) {
    const electricalSkill = this.player?.skills?.electrical || 0;
    const isElectrician = this.player?.occupation === 'electrician';

    import('../minigames/templates/ConnectMatchTemplate.js').then(({ ConnectMatchTemplate }) => {
      this.miniGameManager.launchActivity({
        type: 'circuit_repair',
        mechanic: 'connect_match',
        title: job ? 'Grid Transformer Maintenance' : 'Fuse Box Circuit Diagnostic',
        subtitle: 'Electrical — Wiring & Diagnostics',
        instructions: 'Match matching terminals by clicking a left node and then its corresponding right circuit output.',
        baseDifficulty: 0.50,
        skillLevel: electricalSkill,
        toolBonus: isElectrician ? 0.15 : 0,
        gameMinutesSpent: job ? job.durationHours * 60 : 25,
        requiredMaterials: [],
        rewardDefinition: {
          money: job ? job.getReward(this.player) : (isElectrician ? 45 : 20),
          skillExp: { skillName: 'electrical', exp: 25 },
        },
      }, (stageEl, derivedParams, submitFn, cancelFn) => {
        ConnectMatchTemplate.mount(stageEl, derivedParams, {
          activityType: 'circuit_repair',
          gameMinutesSpent: job ? job.durationHours * 60 : 25,
          onSubmit: (result) => {
            const receipt = submitFn(result);
            if (receipt.success && receipt.outcome === 'success') {
              if (job) {
                this.needs.fatigue = Math.min(100, this.needs.fatigue + job.fatigueCost);
              }
              if (this.sound) this.sound.playCash();
              const earned = receipt.grantedRewards?.money || (job ? job.getReward(this.player) : 20);
              this.showNotification(`Circuits online! Payout: +$${earned} (${receipt.qualityTier.toUpperCase()} quality).`);
            } else if (receipt.outcome === 'failure') {
              if (job) {
                this.needs.fatigue = Math.min(100, this.needs.fatigue + Math.round(job.fatigueCost / 2));
              }
              this.showNotification('Electrical short circuit! Breaker tripped without repair.');
            }
          },
          onCancel: cancelFn,
          setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
          setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
          setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
        });
      });
    });
  }

  /**
   * Launch Cooking Ordered Sequence mini-game.
   */
  startCookingMiniGame() {
    const cookingSkill = this.player?.skills?.cooking || 15;
    const hasVegetable = this.inventory.hasItem('corn', 1) || this.inventory.hasItem('tomato', 1);
    const vegItemId = this.inventory.hasItem('corn', 1) ? 'corn' : (this.inventory.hasItem('tomato', 1) ? 'tomato' : null);

    const requiredMaterials = vegItemId ? [{ itemId: vegItemId, count: 1 }] : [];

    import('../minigames/templates/OrderedSequenceTemplate.js').then(({ OrderedSequenceTemplate }) => {
      this.miniGameManager.launchActivity({
        type: 'cooking',
        mechanic: 'ordered_sequence',
        title: vegItemId ? 'Cooking Hearty Garden Stew' : 'Boiling Ration Porridge',
        subtitle: 'Culinary — Kitchen Cooking Stove',
        instructions: 'Follow procedural cooking steps in the correct order to prepare a nourishing hot meal.',
        baseDifficulty: 0.40,
        skillLevel: cookingSkill,
        toolBonus: this.player?.occupation === 'farmer' ? 0.10 : 0,
        gameMinutesSpent: 25,
        requiredMaterials,
        rewardDefinition: {
          skillExp: { skillName: 'cooking', exp: 20 },
        },
      }, (stageEl, derivedParams, submitFn, cancelFn) => {
        OrderedSequenceTemplate.mount(stageEl, derivedParams, {
          activityType: 'cooking',
          gameMinutesSpent: 25,
          onSubmit: (result) => {
            const receipt = submitFn(result);
            if (receipt.success && receipt.outcome === 'success') {
              const hungerRelief = receipt.qualityTier === 'master' ? 45 : receipt.qualityTier === 'good' ? 35 : 25;
              const healthRelief = receipt.qualityTier === 'master' ? 20 : 10;
              this.needs.hunger = Math.max(0, this.needs.hunger - hungerRelief);
              this.needs.health = Math.min(100, this.needs.health + healthRelief);
              if (this.sound) this.sound.playClick();
              this.showNotification(`Delicious meal cooked! Hunger reduced (-${hungerRelief}), Health restored (+${healthRelief}). Quality: ${receipt.qualityTier.toUpperCase()}.`);
            } else if (receipt.outcome === 'failure') {
              this.showNotification('Recipe burned! Food scorched over unmanaged heat.');
            }
          },
          onCancel: cancelFn,
          setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
          setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
          setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
        });
      });
    });
  }

  /**
   * Launch Shortwave Radio Tuning Grid Selection mini-game.
   */
  startRadioTuningMiniGame() {
    const electricalSkill = this.player?.skills?.electrical || 10;
    const isElectrician = this.player?.occupation === 'electrician';

    import('../minigames/templates/GridSelectionTemplate.js').then(({ GridSelectionTemplate }) => {
      this.miniGameManager.launchActivity({
        type: 'radio_tuning',
        mechanic: 'grid_selection',
        title: 'Shortwave Emergency Broadcast Tuning',
        subtitle: 'Communications — Ham Radio Transceiver',
        instructions: 'Sweep through frequencies on the radar grid using carrier wave proximity (HOT / WARM / COLD) to lock onto active broadcast signals.',
        baseDifficulty: 0.45,
        skillLevel: electricalSkill,
        toolBonus: isElectrician ? 0.15 : 0,
        gameMinutesSpent: 20,
        requiredMaterials: [],
        rewardDefinition: {
          skillExp: { skillName: 'electrical', exp: 20 },
        },
      }, (stageEl, derivedParams, submitFn, cancelFn) => {
        GridSelectionTemplate.mount(stageEl, derivedParams, {
          activityType: 'radio_tuning',
          gameMinutesSpent: 20,
          onSubmit: (result) => {
            const receipt = submitFn(result);
            if (receipt.success && receipt.outcome === 'success') {
              this.needs.fatigue = Math.max(0, this.needs.fatigue - 10);
              if (this.sound) this.sound.playClick();
              this.showNotification(`Emergency frequency captured! Broadcast audio brings relief from isolation (-10 Fatigue). Quality: ${receipt.qualityTier.toUpperCase()}.`);
            } else if (receipt.outcome === 'failure') {
              this.showNotification('Frequencies drowned in static noise. Antenna failed to resolve a carrier signal.');
            }
          },
          onCancel: cancelFn,
          setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
          setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
          setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
        });
      });
    });
  }

  /**
   * Launch Supply Storage Pack and Fit mini-game.
   */
  startPackingMiniGame() {
    const craftingSkill = this.player?.skills?.crafting || 10;

    import('../minigames/templates/PackFitTemplate.js').then(({ PackFitTemplate }) => {
      this.miniGameManager.launchActivity({
        type: 'pack_supplies',
        mechanic: 'pack_fit',
        title: 'Emergency Supply Trunk Packing',
        subtitle: 'Logistics — Secure Storage Trunk',
        instructions: 'Pack candidate survival items into the storage trunk without exceeding the weight limit, maximizing total survival value.',
        baseDifficulty: 0.40,
        skillLevel: craftingSkill,
        toolBonus: 0,
        gameMinutesSpent: 20,
        requiredMaterials: [],
        rewardDefinition: {
          money: 35,
          skillExp: { skillName: 'crafting', exp: 25 },
        },
      }, (stageEl, derivedParams, submitFn, cancelFn) => {
        PackFitTemplate.mount(stageEl, derivedParams, {
          activityType: 'pack_supplies',
          gameMinutesSpent: 20,
          onSubmit: (result) => {
            const receipt = submitFn(result);
            if (receipt.success && receipt.outcome === 'success') {
              if (this.sound) this.sound.playCash();
              const rewardMoney = receipt.grantedRewards?.money || 35;
              this.showNotification(`Storage trunk neatly organized! Payout: +$${rewardMoney} (${receipt.qualityTier.toUpperCase()} quality).`);
            } else if (receipt.outcome === 'failure') {
              this.showNotification('Packing disorganized. Container could not be sealed securely.');
            }
          },
          onCancel: cancelFn,
          setFeedback: (msg, type) => this.miniGameManager.activeOverlay?.setFeedback(msg, type),
          setProgress: (pct, label) => this.miniGameManager.activeOverlay?.setProgress(pct, label),
          setActionButton: (label, onClick) => this.miniGameManager.activeOverlay?.setActionButton(label, onClick),
        });
      });
    });
  }

  /**
   * Sleep to rest, with Scheduled-Event Protection against skipping.
   * @param {number} hours
   */
  sleep(hours = 8) {
    // Check if any scheduled warning event falls inside this sleep interval
    const pending = this.eventManager.findEventInInterval(this.clock.day, this.clock.hour, hours);

    const fadeEl = document.getElementById('screen-fade');
    if (fadeEl) fadeEl.classList.add('active');

    setTimeout(() => {
      if (pending) {
        // Sleep interrupted at the exact hour of the scheduled event!
        const advanceHours = pending.hoursUntilEvent;
        this.clock.advanceHours(advanceHours);
        this.needs.advanceHours(advanceHours, this.player.traits);
        this.farmingSystem.advanceHours(advanceHours);
        this._updateHUD();

        setTimeout(() => {
          if (fadeEl) fadeEl.classList.remove('active');
          this.showNotification('Your rest was interrupted by an urgent event!');
          this.triggerEvent(pending.event.id);
        }, 300);
      } else {
        // Full uninterrupted sleep
        this.clock.advanceHours(hours);
        this.needs.sleep(hours, this.player.traits);
        this.farmingSystem.advanceHours(hours);
        this._updateHUD();

        setTimeout(() => {
          if (fadeEl) fadeEl.classList.remove('active');
          this.showNotification(`You awaken feeling rested. ${hours} hours have passed.`);
        }, 300);
      }
    }, 350);
  }

  /**
   * Pause the game.
   */
  pauseGame() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this.clock.pause();
    this._pauseOverlay.classList.remove('hidden');
  }

  /**
   * Resume from pause.
   */
  resumeGame() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.clock.resume();
    this._pauseOverlay.classList.add('hidden');
  }

  /**
   * Display atmospheric notification toast.
   * @param {string} message
   */
  showNotification(message) {
    if (!this._toast) return;
    if (this._toastTimer) clearTimeout(this._toastTimer);

    this._toast.textContent = message;
    this._toast.classList.remove('hidden');

    this._toastTimer = setTimeout(() => {
      this._toast.classList.add('hidden');
      this._toastTimer = null;
    }, 3500);
  }

  /**
   * Fortify the farmhouse door using gathered timber planks.
   */
  reinforceDoorBarricade() {
    if (this.doorBarricadeLevel >= BALANCE.BARRICADE_MAX_LEVEL) {
      this.showNotification('Farmhouse door is already heavily fortified to maximum capacity!');
      return;
    }
    if (!this.inventory.hasItem('wood', BALANCE.BARRICADE_WOOD_COST)) {
      this.showNotification(`Requires ${BALANCE.BARRICADE_WOOD_COST}x Timber Planks in pack to fortify door.`);
      return;
    }

    this.inventory.removeItem('wood', BALANCE.BARRICADE_WOOD_COST);
    this.doorBarricadeLevel++;
    this.baseDefenseLevel++;
    this.sound.playHammer();
    this.showNotification(`Reinforced farmhouse door! (Barricade Level ${this.doorBarricadeLevel}/${BALANCE.BARRICADE_MAX_LEVEL})`);
  }

  /**
   * Check if the Escape Utility Truck has all parts and repairs completed.
   * @returns {boolean}
   */
  isTruckFullyRepaired() {
    return Boolean(this.truckState.battery && this.truckState.fuel && this.truckState.engineRepaired);
  }

  /**
   * Interact with the Escape Utility Truck parked outside.
   */
  interactWithTruck() {
    // 1. Check 12V Battery
    if (!this.truckState.battery) {
      if (this.inventory.hasItem('car_battery', 1)) {
        this.inventory.removeItem('car_battery', 1);
        this.truckState.battery = true;
        this.sound.playHammer();
        this.showNotification('Installed heavy 12V car battery into the utility truck.');
      } else {
        this.showNotification('Utility Truck: Missing a functioning Car Battery (buy from County Store).');
        return;
      }
    }

    // 2. Check Fuel Canister
    if (!this.truckState.fuel) {
      if (this.inventory.hasItem('fuel_can', 1)) {
        this.inventory.removeItem('fuel_can', 1);
        this.truckState.fuel = true;
        this.sound.playWater();
        this.showNotification('Poured 5-gallon fuel canister into the truck tank.');
      } else {
        this.showNotification('Utility Truck: Fuel tank is dry. Requires a Fuel Canister (buy from County Store).');
        return;
      }
    }

    // 3. Check Engine Mechanical Integrity
    if (!this.truckState.engineRepaired) {
      if (this.player.occupation === 'mechanic') {
        this.truckState.engineRepaired = true;
        this.sound.playHammer();
        this.showNotification('Mechanic expertise: Tuned the carburetor and reconnected spark plugs.');
      } else if (this.inventory.hasItem('wood', 2)) {
        this.inventory.removeItem('wood', 2);
        this.truckState.engineRepaired = true;
        this.sound.playHammer();
        this.showNotification('Replaced damaged engine mounts and secured belts with 2x Timber Planks.');
      } else {
        this.showNotification('Utility Truck: Engine manifold damaged. Requires 2x Timber Planks to fix (or Mechanic skill).');
        return;
      }
    }

    // 4. Ready state check
    if (this.isTruckFullyRepaired()) {
      if (this.worldStage === 'outbreak') {
        this.triggerVictoryEscape();
      } else {
        this.sound.playEngine();
        this.showNotification('Truck engine hums steadily! Ready for emergency evacuation if danger strikes.');
      }
    }
  }

  /**
   * Trigger Ending B — The Evacuation Corridor victory escape.
   */
  triggerVictoryEscape() {
    if (this.state === GameState.VICTORY) return;
    this.state = GameState.VICTORY;
    this.clock.pause();

    if (this._hud) this._hud.classList.add('hidden');
    if (this._pauseOverlay) this._pauseOverlay.classList.add('hidden');
    if (this._activeModal) {
      this._activeModal.close();
      this._activeModal = null;
    }

    this.sound.playEngine();
    setTimeout(() => this.sound.playVictory(), 500);

    const calebEscaped = this.neighborReputation >= 15;
    if (this._vCompanionText) {
      this._vCompanionText.textContent = calebEscaped
        ? `Caleb Miller escaped with you! (Trust: ${this.neighborReputation})`
        : 'You evacuated alone. Caleb was lost in the valley.';
    }
    if (this._vNarrative) {
      this._vNarrative.textContent = calebEscaped
        ? 'With Caleb riding shotgun navigating back roads, the utility truck punched through the infected roadblock and reached the state military safe zone.'
        : 'The utility truck tore through the valley perimeter, carrying you past burning roadblocks to the safety beyond.';
    }

    if (this._vstatDays) this._vstatDays.textContent = `Day ${this.clock.day}`;
    if (this._vstatTime) this._vstatTime.textContent = this.clock.getTimeString();
    if (this._vstatZombies) this._vstatZombies.textContent = `${this.stats.zombiesDefeated}`;
    if (this._vstatMoney) this._vstatMoney.textContent = `$${this.money}`;
    if (this._vstatCrops) this._vstatCrops.textContent = `${this.stats.cropsHarvested}`;

    if (this._victoryScreen) {
      this._victoryScreen.classList.remove('hidden');
    }
  }

  /**
   * Trigger Ending A — Last Stand game over screen upon player death.
   * @param {string} causeText
   */
  triggerGameOver(causeText = 'Succumbed to mortal wounds in the valley.') {
    if (this.state === GameState.GAME_OVER) return;
    this.state = GameState.GAME_OVER;
    this.clock.pause();
    this.sound.playGameOver();

    if (this._hud) this._hud.classList.add('hidden');
    if (this._pauseOverlay) this._pauseOverlay.classList.add('hidden');
    if (this._activeModal) {
      this._activeModal.close();
      this._activeModal = null;
    }

    if (this._gameOverCause) this._gameOverCause.textContent = causeText;
    if (this._statDays) this._statDays.textContent = `Day ${this.clock.day}`;
    if (this._statTime) this._statTime.textContent = this.clock.getTimeString();
    if (this._statZombies) this._statZombies.textContent = `${this.stats.zombiesDefeated}`;
    if (this._statWarnings) this._statWarnings.textContent = `${this.eventManager.getCompletedWarningCount()}`;
    if (this._statCrops) this._statCrops.textContent = `${this.stats.cropsHarvested}`;

    if (this._gameOverScreen) {
      this._gameOverScreen.classList.remove('hidden');
    }
  }

  /**
   * Fixed-timestep simulation update.
   * @param {number} dt - Delta time in seconds.
   * @private
   */
  _update(dt) {
    if (this.input.isJustPressed('i')) {
      if (this.state === GameState.PLAYING) {
        this.toggleInventory();
      }
    }

    if (this.input.isJustPressed('escape')) {
      if (this._activeModal) {
        this._activeModal.close();
        this._activeModal = null;
      } else if (this.state === GameState.PLAYING) {
        this.pauseGame();
      } else if (this.state === GameState.PAUSED) {
        this.resumeGame();
      }
    }

    if (this.state === GameState.PLAYING) {
      const scene = this.sceneManager.getCurrentSceneConfig();
      const isInterior = this.sceneManager.currentScene === SceneType.INTERIOR;

      // Check player health
      if (this.needs.health <= 0) {
        this.triggerGameOver('Succumbed to mortal wounds and severe exhaustion.');
        this.input.endFrame();
        return;
      }

      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);

      // Only simulate player & world when not fading or in modal
      if (!this.sceneManager.isTransitioning && !this._activeModal) {
        this.clock.advanceByRealTime(dt);

        const elapsedGameHours = (dt * BALANCE.GAME_MINUTES_PER_REAL_SECOND) / 60;
        this.needs.advanceHours(elapsedGameHours, this.player.traits);
        this.farmingSystem.advanceHours(elapsedGameHours);

        this.player.update(this.input, dt, scene.worldWidth, scene.groundY);
        this.sceneManager.update(this.player, this.input);

        // Check if any scheduled event is due
        const dueEvent = this.eventManager.getDueEvent(this.clock.day, this.clock.hour);
        if (dueEvent) {
          this.triggerEvent(dueEvent.id);
        }

        // Outbreak check
        if (this.worldStage !== 'outbreak' && this.eventManager.isOutbreakTriggered(this.clock.day, this.clock.hour)) {
          this.worldStage = 'outbreak';
          this.sound.playSiren();
          if (this.zombies.length === 0) {
            this.zombies.push(new Zombie(1270, scene.groundY, null, 'walker'));
            this.zombies.push(new Zombie(150, scene.groundY, null, 'runner'));
          }
        }

        // Melee Combat: Player strikes living zombies in front
        if (this.player.justAttacked) {
          this.sound.playMeleeSwing();
          for (const zombie of this.zombies) {
            if (zombie.isDead) continue;
            const dist = Math.abs(zombie.x - this.player.x);
            const inFacing = this.player.facing === 1 ? (zombie.x >= this.player.x - 12) : (zombie.x <= this.player.x + 12);

            if (dist <= this.player.attackReach && inFacing) {
              const bonusDmg = this.inventory.hasItem('wood', 1) ? 5 : 0;
              const dmg = this.player.attackDamage + bonusDmg;
              const res = zombie.takeDamage(dmg, this.player.facing);
              this.stats.damageDealt += dmg;
              this.sound.playHit();

              if (res.dead) {
                this.stats.zombiesDefeated++;
                this.showNotification(`Infected ${zombie.type === 'runner' ? 'runner' : 'walker'} eliminated!`);
              } else {
                this.showNotification(`Struck ${zombie.type === 'runner' ? 'runner' : 'walker'} for ${dmg} damage!`);
              }
            }
          }
        }

        // Zombie Spawning & Simulation during Outbreak
        if (this.worldStage === 'outbreak') {
          const livingZombies = this.zombies.filter(z => !z.isDead);
          if (livingZombies.length < 3 && !isInterior) {
            this.zombieSpawnTimer -= dt;
            if (this.zombieSpawnTimer <= 0) {
              const spawnX = Math.random() > 0.5 ? 60 : scene.worldWidth - 60;
              const isRunner = Math.random() < 0.35;
              const z = new Zombie(spawnX, scene.groundY, null, isRunner ? 'runner' : 'walker');
              this.zombies.push(z);
              this.sound.playZombieGroan(isRunner);
              this.zombieSpawnTimer = 8 + Math.random() * 5;
            }
          }

          // Update zombie positions, AI, and attacks
          for (const zombie of this.zombies) {
            const atk = zombie.update(dt, this.player.x, this.player.y, scene.worldWidth, isInterior);
            if (atk?.attacked && !isInterior) {
              this.needs.health = Math.max(0, this.needs.health - atk.damage);
              this.damageFlashTimer = 0.45;
              this.stats.damageTaken += atk.damage;
              this.player.x += zombie.facing * 18;
              this.sound.playZombieGroan(zombie.type === 'runner');
              this.showNotification(`The infected struck you for ${atk.damage} damage!`);

              if (this.needs.health <= 0) {
                this.triggerGameOver('Killed in combat by the infected horde.');
                this.input.endFrame();
                return;
              }
            }
          }
        }
      }

      if (this.camera) {
        const size = this.renderer.getLogicalSize();
        this.camera.resize(size.width, size.height);
        this.camera.update(this.player.x, this.player.y, scene.worldWidth);
      }

      this.gameTime += dt;
      this._updateHUD();
    }

    this.input.endFrame();
  }

  /**
   * Render the current frame.
   * @private
   */
  _render() {
    if (this.state === GameState.TITLE || this.state === GameState.CREATOR || this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) return;
    if (!this.camera) return;

    this.renderer.renderFrame(
      this.player,
      this.camera,
      this.clock,
      this.gameTime,
      this.sceneManager.currentScene,
      this.sceneManager.activePrompt,
      this.farmingSystem,
      this.worldStage,
      this.zombies,
      this.doorBarricadeLevel,
      this.damageFlashTimer,
      this.isTruckFullyRepaired()
    );
  }

  /**
   * Update HUD display elements and survival meters.
   * @private
   */
  _updateHUD() {
    if (this._hudDay) this._hudDay.textContent = this.clock.getDayString();
    if (this._hudTime) this._hudTime.textContent = this.clock.getTimeString();
    if (this._hudMoney) this._hudMoney.textContent = `$${this.money}`;
    if (this._hudLocation) {
      const scene = this.sceneManager.getCurrentSceneConfig();
      this._hudLocation.textContent = scene?.name || 'Suncrest Ranch';
    }
    if (this._hudName) {
      this._hudName.textContent = this.player.name || 'Survivor';
    }

    if (this._meterHealth) {
      this._meterHealth.style.width = `${Math.max(0, Math.min(100, this.needs.health))}%`;
    }
    if (this._meterHunger) {
      this._meterHunger.style.width = `${Math.max(0, Math.min(100, this.needs.hunger))}%`;
    }
    if (this._meterThirst) {
      this._meterThirst.style.width = `${Math.max(0, Math.min(100, this.needs.thirst))}%`;
    }
    if (this._meterFatigue) {
      this._meterFatigue.style.width = `${Math.max(0, Math.min(100, this.needs.fatigue))}%`;
    }
  }
}
