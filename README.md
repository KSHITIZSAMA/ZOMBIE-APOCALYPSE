# Before the Dead

> **Prepare. Survive. Endure.**
> A hand-drawn 2D side-scrolling life simulator and zombie survival sandbox built with Vanilla JavaScript, HTML5 Canvas, Web Audio API, and Vite.

---

## 🎮 Overview

**Before the Dead** places you into an ordinary life in a rural valley before anyone knows an apocalypse is coming. 

You begin by creating your survivor—choosing your name, appearance, starting occupation, and personality traits. You purchase supplies, earn money through daytime labor, cultivate crops on your ranch, converse with neighbors, and prepare your homestead.

As days pass, subtle narrative warnings and emergency broadcasts unfold. When the undead outbreak erupts, the atmosphere shifts, the valley is engulfed in crimson dusk, and the infected breach the ranch perimeter. How long you survive—or whether you manage to evacuate—depends entirely on your preparation, skills, and choices.

---

## 🕹️ Controls

| Action | Primary Key | Secondary Key / Mouse |
| :--- | :--- | :--- |
| **Move Left** | <kbd>A</kbd> | <kbd>←</kbd> (Left Arrow) |
| **Move Right** | <kbd>D</kbd> | <kbd>→</kbd> (Right Arrow) |
| **Interact / Inspect** | <kbd>E</kbd> | In-world action button |
| **Melee Attack / Strike** | <kbd>Space</kbd> | Left Click |
| **Open Pack (Inventory)** | <kbd>I</kbd> | HUD Pack Button |
| **Pause / Resume** | <kbd>Escape</kbd> | — |
| **Toggle Audio Mute** | HUD Mute Button (`🔊`/`🔇`) | — |
| **Dev Debug Panel (Dev Only)** | <kbd>F1</kbd> | — |

---

## 🌾 Core Gameplay Systems

### 1. Character Creation
- **Customization:** Name, headwear, hairstyles, shirt & pants colors, and skin tones.
- **Occupations:**
  - **Farmer:** Faster crop growth, farming tool proficiency, agricultural jobs.
  - **Electrician:** Electrical infrastructure mastery, high-paying technical shifts.
  - **Writer:** Observant perception, freelance writing income from home desk.
- **Traits:** *Hardy* (slower fatigue/hunger decay), *Night Owl* (reduced fatigue penalties after dark), *Resourceful* (bonus salvage), *Green Thumb* (faster crop cycles), and *Paranoid* (earlier event detection).

### 2. Side-Scrolling Ranch & Interior
- **Seamless Scene Transitions:** Seamlessly step between the exterior ranch grounds and the cozy farmhouse interior with smooth ambient lighting and time-of-day illumination.
- **Interactive Points of Interest:**
  - **County General Store:** Purchase provisions (water bottles, canned food, seeds) and critical escape components (12V Car Battery, Fuel Canister).
  - **Community Well:** Draw clean groundwater to replenish thirst and water crops.
  - **Agricultural Soil:** Till soil, sow corn/tomatoes, water daily, and harvest mature crops to sell for cash or consume.
  - **Timber Woodpile:** Chop and harvest wood planks for home barricades and vehicle repairs.
  - **Neighbor Caleb Miller:** Converse, build trust, and heed early rumors of military roadblocks.
  - **Interior Bed & Kitchen:** Rest to restore fatigue (protected by scheduled event wake-up alarms) and store dry rations.
  - **Utility Escape Truck:** Parked near the property line ready to be restored.

### 3. Dynamic Narrative & Scheduled Events
- **Seed-Based Randomization:** Deterministic procedural event timelines with randomized outbreak dates (typically between Day 14 and Day 21).
- **Three-Tier Warning Arc:** Unsettling news reports, missing persons, radio static, and panic buying before the outbreak arrives.
- **Sleep Protection:** If you sleep while a critical story warning occurs, you are immediately awakened to witness the event.

### 4. Apocalypse, Combat & Base Defense
- **The Outbreak:** Crimson blood-dusk sky, dense rolling smoke pillars, broken fencing, and atmospheric red-tinted fog.
- **Undead Variants:**
  - **Walkers:** 30 HP, 32 px/s speed, 12 damage. Shambling decayed infected with jointed animations and glowing red pupils.
  - **Runners:** 20 HP, 82 px/s sprint speed, 8 damage. Fast, lunging infected with pale green skin and torn red garments.
- **Real-Time Melee Combat:** Weapon swoosh slash animations, knockback physics, stun timers, and screen impact flashes. Carrying wood planks grants +5 melee bonus damage.
- **Door Barricades:** Reinforce your farmhouse door up to 3 levels using 2x Timber Planks per level, rendering heavy nailed timber crossbeams on the door frame.

### 5. Multiple Endings

| Ending | Type | Condition |
| :--- | :--- | :--- |
| **Ending A — The Last Stand** | Defeat / Survival Summary | Player health drops to 0. Displays comprehensive statistics including days survived, undead eliminated, and crops harvested. |
| **Ending B — The Evacuation Corridor** | Victory Escape | Install a **12V Car Battery**, pour **Fuel**, and repair the **Utility Truck Engine**. Triggered during the outbreak. If Caleb's trust is $\ge 15$, Caleb escapes with you; otherwise, you escape alone. |

---

## 🔊 Procedural Audio Engine

All sound effects are synthetically generated in real time using the **Web Audio API** (zero external MP3/WAV assets):
- Crisp triangle-filtered melee swings and punchy sine-drop hits.
- Shambling low-frequency groans and screeching runner lunges.
- Multi-harmonic emergency klaxon siren at outbreak dawn.
- Percussive wooden hammer strikes on door barricades and engine repairs.
- Two-tone cash chimes and fluid groundwater scoops.
- Multi-cylinder sawtooth engine ignition and revving sequence.
- Victory fanfare and game-over chords.
- Audio mute toggle in HUD with `localStorage` memory.

---

## 💾 Save & Load System

- Complete game state serialization in `localStorage` under versioned schemas.
- Saves clock time, player attributes, hunger/thirst/fatigue needs, inventory slots, farming growth stages, completed event decisions, door barricade levels, truck restoration progress, and kill statistics.

---

## 🛠️ Tech Stack & Architecture

- **Language:** Vanilla JavaScript (ES2022+ Modules)
- **Rendering:** HTML5 Canvas 2D Context (High-DPI retina support, custom stickman skeletal IK rigging)
- **Styling:** Modern Vanilla CSS (Design tokens, CSS variables, glassmorphic HUD, Google Fonts *Caveat* & *Inter*)
- **Audio:** Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`)
- **Bundler:** Vite
- **Test Runner:** Vitest (128 passing automated unit tests)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation & Launch

```bash
# Clone or navigate to the project directory
cd "ZOMBIE APOCALYPSE"

# Install dependencies
npm install

# Start local development server
npm run dev

# Run all 128 automated unit tests
npm test

# Build optimized production bundle
npm run build
```

Open your browser at `http://localhost:5173/` to play.

---

## 🔧 Dev Debug Panel

Press <kbd>F1</kbd> in development mode (`npm run dev`) to toggle the Dev Debug Panel:
- **+1 Hour / +1 Day:** Fast-forward time and simulation needs.
- **+$100 Cash:** Add immediate funds.
- **Restore Needs:** Instantly reset health to 100% and clear hunger, thirst, and fatigue.
- **Trigger Warning Event:** Force next scheduled story event.
- **Jump to Outbreak:** Instantly trigger the outbreak and sky shift.
- **Spawn Walker / Runner:** Spawn infected entities near player.
- **Repair Truck:** Instantly install battery, fuel, and repair the escape truck.

---

## 📜 License

Created as an indie game prototype. All code and procedural systems are open for inspection and extension.
