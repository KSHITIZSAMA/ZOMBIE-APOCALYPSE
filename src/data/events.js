/**
 * Narrative Events & Pre-Outbreak Warnings definition.
 * Data-driven events with trigger times, dialogue, choices, requirements, and state consequences.
 */

export const STORY_EVENTS = {
  // Warning Event 1: Early Rumors & News Report
  SUSPICIOUS_BROADCAST: {
    id: 'suspicious_broadcast',
    title: 'Anomalous Broadcast',
    stage: 'early_warning',
    defaultTriggerDay: 2,
    defaultTriggerHour: 18,
    speaker: 'Emergency Radio Wire',
    sceneArt: 'radio',
    description: 'While tuning through the static on the battery receiver, an agitated broadcaster interrupts normal programming with a county-wide advisory.',
    dialogue: '"...State Health Department urges all residents in Greenbriar and neighboring rural zones to report unexplained aggressive behavior and severe fevers immediately. St. Jude Regional Hospital is operating under Level 3 intake containment..."',
    choices: [
      {
        id: 'listen_carefully',
        text: 'Listen closely and take notes on affected areas.',
        outcomeText: 'You mark the quarantined highway junctions on your map. Your awareness of regional danger increases.',
        consequence: (game) => {
          game.worldStage = 'early_warning';
          game.showNotification('Updated notes on regional disease rumors.');
        },
      },
      {
        id: 'check_supplies',
        text: 'Take the warning seriously and inspect your pantry reserves.',
        outcomeText: 'Seeing the broadcast, you double-check your canned goods and secure clean water bottles.',
        consequence: (game) => {
          game.worldStage = 'early_warning';
          game.inventory.addItem('canned_food', 1);
          game.showNotification('Prepared an extra ration of Canned Stew.');
        },
      },
      {
        id: 'dismiss_panic',
        text: 'Dismiss it as sensationalized media alarmism.',
        outcomeText: 'You switch off the receiver. Still, the silence in the farmhouse feels heavier than before.',
        consequence: (game) => {
          game.worldStage = 'early_warning';
        },
      },
    ],
  },

  // Warning Event 2: Neighbor Caleb's Request & Power Flickers
  NEIGHBOR_CALEB_REQUEST: {
    id: 'neighbor_caleb_request',
    title: "Caleb's Request",
    stage: 'escalating_crisis',
    defaultTriggerDay: 5,
    defaultTriggerHour: 10,
    speaker: 'Caleb Miller (Neighbor)',
    sceneArt: 'neighbor',
    description: 'Caleb Miller from the neighboring homestead walks up the gravel pathway holding a flashlight. His expression is unusually grim.',
    dialogue: '"Morning, neighbor. Did your power cut out last night too? The entire eastern valley line is dead, and the telephone operator isn\'t answering. I\'m trying to board up my basement generator shed. Could you spare some timber planks or advice?"',
    choices: [
      {
        id: 'give_wood',
        text: 'Spare 2 Timber Planks to help Caleb fortify his shed.',
        prerequisite: (game) => game.inventory.hasItem('wood', 2),
        prerequisiteText: 'Requires 2x Timber Planks in pack',
        outcomeText: 'Caleb takes the timber with profound relief. "I won\'t forget this, neighbor. Here, take some extra fresh water my well pumped earlier."',
        consequence: (game) => {
          game.inventory.removeItem('wood', 2);
          game.inventory.addItem('water_bottle', 2);
          game.neighborReputation = (game.neighborReputation || 0) + 15;
          game.worldStage = 'escalating_crisis';
          game.showNotification('Helped Caleb: Neighbor relationship improved (+2 Water Bottles).');
        },
      },
      {
        id: 'electrician_advice',
        text: '[Electrician] Inspect Caleb\'s generator wiring yourself.',
        prerequisite: (game) => game.player.occupation === 'electrician',
        prerequisiteText: 'Requires Electrician occupation',
        outcomeText: 'You walk over to his shed and rewire the surge fuses correctly. Caleb hands you a stack of cash for the professional repair.',
        consequence: (game) => {
          game.money += 75;
          game.neighborReputation = (game.neighborReputation || 0) + 20;
          game.worldStage = 'escalating_crisis';
          game.showNotification('Rewired Caleb\'s generator (+$75, Neighbor Trust increased).');
        },
      },
      {
        id: 'decline_aid',
        text: 'Politely apologize and explain you need all your materials.',
        outcomeText: 'Caleb nods quietly. "Understood. Times feel uneasy. Keep your doors locked at night, friend."',
        consequence: (game) => {
          game.worldStage = 'escalating_crisis';
        },
      },
    ],
  },

  // Warning Event 3: Highway Roadblock & Quarantine Siren
  ROADBLOCK_ALERT: {
    id: 'roadblock_alert',
    title: 'County Roadblock & Emergency Siren',
    stage: 'escalating_crisis',
    defaultTriggerDay: 8,
    defaultTriggerHour: 14,
    speaker: 'County Emergency Broadcast',
    sceneArt: 'siren',
    description: 'Distant wailing sirens echo across the valley. Black smoke rises on the southern highway horizon, and a state patrol loudspeaker echoes through the trees.',
    dialogue: '"All civilian travel on Route 9 is indefinitely suspended. Military logistics teams have closed highway transit. Stay inside your dwellings and stockpile potable water immediately."',
    choices: [
      {
        id: 'secure_perimeter',
        text: 'Lock the farmhouse gates and inspect your fence perimeter.',
        outcomeText: 'You walk the fence line and hammer loose posts securely. Your farmhouse feels noticeably more defensive.',
        consequence: (game) => {
          game.baseDefenseLevel = (game.baseDefenseLevel || 0) + 1;
          game.showNotification('Perimeter fortified (+1 Base Defense).');
        },
      },
      {
        id: 'scavenge_well',
        text: 'Rush to the well and pump emergency water before pressure drops.',
        outcomeText: 'You pump several emergency jugs from the deep well aquifer.',
        consequence: (game) => {
          game.inventory.addItem('water_bottle', 2);
          game.showNotification('Stored 2x Clean Water Bottles.');
        },
      },
    ],
  },

  // Outbreak Event: The Dead Walk & Quarantine Collapse
  OUTBREAK_EMERGENCE: {
    id: 'outbreak_emergence',
    title: 'The Dead Walk',
    stage: 'outbreak',
    defaultTriggerDay: 14,
    defaultTriggerHour: 18,
    speaker: 'Emergency Broadcast (Final Transmission)',
    sceneArt: 'siren',
    description: 'A harrowing air-raid klaxon wails across the valley. Military radio chatter dissolves into terrified static, echoing gunfire, and shrill screams. At the edge of your ranch perimeter, twisted shambling shapes stagger through the trees.',
    dialogue: '"All regional quarantine lines have broken. Civilian evacuation corridors are officially abandoned. Hostile biological infection confirmed. If you are hearing this broadcast... barricade your dwellings, arm yourselves, and pray." — [SIGNAL LOST]',
    choices: [
      {
        id: 'brace_for_assault',
        text: 'Grip your weapon and stand your ground against the breach.',
        outcomeText: 'You take a deep breath and steady your stance. The outbreak has begun.',
        consequence: (game) => {
          game.worldStage = 'outbreak';
          game.showNotification('CONTAINMENT COLLAPSE: The Dead walk the valley!');
        },
      },
      {
        id: 'reinforce_doors',
        text: 'Rush towards the farmhouse and prepare the barricades.',
        outcomeText: 'You sprint back toward the farmhouse porch, ready to lock down every entrance.',
        consequence: (game) => {
          game.worldStage = 'outbreak';
          game.showNotification('CONTAINMENT COLLAPSE: Fortify the homestead!');
        },
      },
    ],
  },
};

/**
 * Get an event by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getStoryEvent(id) {
  return STORY_EVENTS[id.toUpperCase()] || null;
}
