/**
 * Debug Panel — DEV MODE ONLY.
 * This entire module is only imported conditionally via import.meta.env.DEV.
 */

export function setupDebugPanel(game) {
  const container = document.getElementById('game-container');

  const panel = document.createElement('div');
  panel.className = 'debug-panel hidden';
  panel.id = 'debug-panel';
  panel.innerHTML = `
    <h3>🔧 Dev Debug Panel</h3>
    <div class="debug-row"><span class="label">Seed</span><span class="value" id="dbg-seed">—</span></div>
    <div class="debug-row"><span class="label">Day & Time</span><span class="value" id="dbg-time">—</span></div>
    <div class="debug-row"><span class="label">Stage</span><span class="value" id="dbg-stage">—</span></div>
    <div class="debug-row"><span class="label">Warnings</span><span class="value" id="dbg-warnings">—</span></div>
    <div class="debug-row"><span class="label">Outbreak Day</span><span class="value" id="dbg-outbreak">—</span></div>
    <div class="debug-row"><span class="label">Money</span><span class="value" id="dbg-money">—</span></div>
    <div class="debug-row"><span class="label">FPS</span><span class="value" id="dbg-fps">—</span></div>

    <div class="debug-buttons">
      <button class="debug-btn" id="dbg-advance-1h">+1 Hour</button>
      <button class="debug-btn" id="dbg-advance-day">+1 Day</button>
      <button class="debug-btn" id="dbg-add-money">+$100 Cash</button>
      <button class="debug-btn" id="dbg-restore-needs">Restore Needs</button>
      <button class="debug-btn" id="dbg-trigger-event">Trigger Warning Event</button>
      <button class="debug-btn" id="dbg-jump-outbreak">Jump to Outbreak</button>
      <button class="debug-btn" id="dbg-spawn-zombie">Spawn Walker</button>
      <button class="debug-btn" id="dbg-spawn-runner">Spawn Runner</button>
      <button class="debug-btn" id="dbg-repair-truck">Repair Truck</button>
    </div>
  `;

  container.appendChild(panel);

  // Toggle with F1
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      panel.classList.toggle('hidden');
    }
  });

  // Debug button actions
  document.getElementById('dbg-advance-1h').addEventListener('click', () => {
    game.clock.advanceHours(1);
    game.needs.advanceHours(1, game.player.traits);
    game.farmingSystem.advanceHours(1);
    game._updateHUD();
  });

  document.getElementById('dbg-advance-day').addEventListener('click', () => {
    game.clock.advanceHours(24);
    game.needs.advanceHours(24, game.player.traits);
    game.farmingSystem.advanceHours(24);
    game._updateHUD();
  });

  document.getElementById('dbg-add-money').addEventListener('click', () => {
    game.money += 100;
    game._updateHUD();
    game.showNotification('Dev: Added +$100 Cash.');
  });

  document.getElementById('dbg-restore-needs').addEventListener('click', () => {
    game.needs.health = 100;
    game.needs.hunger = 0;
    game.needs.thirst = 0;
    game.needs.fatigue = 0;
    game._updateHUD();
    game.showNotification('Dev: Restored all survival needs.');
  });

  document.getElementById('dbg-trigger-event').addEventListener('click', () => {
    const uncompleted = game.eventManager.scheduledEvents.find((s) => !s.completed);
    if (uncompleted) {
      game.triggerEvent(uncompleted.eventId);
    } else {
      game.showNotification('Dev: All warning events are completed.');
    }
  });

  document.getElementById('dbg-jump-outbreak').addEventListener('click', () => {
    game.worldStage = 'outbreak';
    const targetDay = game.eventManager.outbreakDay || 18;
    const daysNeeded = Math.max(0, targetDay - game.clock.day);
    if (daysNeeded > 0) {
      game.clock.advanceHours(daysNeeded * 24);
    }
    // Complete warnings
    for (const s of game.eventManager.scheduledEvents) {
      game.eventManager.completedEventIds.add(s.eventId);
      s.completed = true;
    }
    const scene = game.sceneManager.getCurrentSceneConfig();
    import('../entities/Zombie.js').then(({ Zombie }) => {
      game.zombies.push(new Zombie(game.player.x + 100, scene.groundY));
      game.zombies.push(new Zombie(game.player.x - 120, scene.groundY));
    });
    game.triggerEvent('outbreak_emergence');
    game._updateHUD();
    game.showNotification(`Dev: Triggered Outbreak on Day ${targetDay}!`);
  });

  const spawnBtn = document.getElementById('dbg-spawn-zombie');
  if (spawnBtn) {
    spawnBtn.addEventListener('click', () => {
      import('../entities/Zombie.js').then(({ Zombie }) => {
        const scene = game.sceneManager.getCurrentSceneConfig();
        const z = new Zombie(game.player.x + 75, scene.groundY);
        game.zombies.push(z);
        game.showNotification('Dev: Spawned an infected walker near player.');
      });
    });
  }

  const spawnRunnerBtn = document.getElementById('dbg-spawn-runner');
  if (spawnRunnerBtn) {
    spawnRunnerBtn.addEventListener('click', () => {
      import('../entities/Zombie.js').then(({ Zombie }) => {
        const scene = game.sceneManager.getCurrentSceneConfig();
        const z = new Zombie(game.player.x + 85, scene.groundY, null, 'runner');
        game.zombies.push(z);
        if (game.sound) game.sound.playZombieGroan(true);
        game.showNotification('Dev: Spawned an infected runner sprinter near player!');
      });
    });
  }

  const repairTruckBtn = document.getElementById('dbg-repair-truck');
  if (repairTruckBtn) {
    repairTruckBtn.addEventListener('click', () => {
      game.truckState = { battery: true, fuel: true, engineRepaired: true };
      if (game.sound) game.sound.playEngine();
      game.showNotification('Dev: Utility Truck fully restored & fueled!');
    });
  }

  // Live updater
  let fpsFrames = 0;
  let fpsTime = performance.now();
  let fpsValue = 60;

  const updateDebug = () => {
    if (!panel.classList.contains('hidden') && game.state !== 'title') {
      fpsFrames++;
      const now = performance.now();
      if (now - fpsTime > 500) {
        fpsValue = Math.round(fpsFrames / ((now - fpsTime) / 1000));
        fpsFrames = 0;
        fpsTime = now;
      }

      const seed = game.rng ? game.rng.getSeed() : '—';
      document.getElementById('dbg-seed').textContent = seed;
      document.getElementById('dbg-time').textContent = `${game.clock.getDayString()} ${game.clock.getTimeString()}`;
      document.getElementById('dbg-stage').textContent = game.worldStage || 'normal';
      document.getElementById('dbg-warnings').textContent = `${game.eventManager.getCompletedWarningCount()} / 3`;
      document.getElementById('dbg-outbreak').textContent = `Day ${game.eventManager.outbreakDay}`;
      document.getElementById('dbg-money').textContent = `$${game.money}`;
      document.getElementById('dbg-fps').textContent = fpsValue;
    }
    requestAnimationFrame(updateDebug);
  };
  requestAnimationFrame(updateDebug);
}
