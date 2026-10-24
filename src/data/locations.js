/**
 * Starting Locations definition.
 * Ranch is the first fully playable location.
 * Skyscraper, Old Town, and Caravan are defined and marked as locked/coming soon.
 */

export const LOCATIONS = {
  RANCH: {
    id: 'ranch',
    name: 'Suncrest Ranch',
    playable: true,
    tagline: 'Quiet rural homestead with fertile land and isolation.',
    description: 'A secluded farm away from urban congestion. Features ample ground for agriculture, a water well, open space for fortifications, and a wooden farmhouse.',
    advantages: [
      'Expansive space for farming and cultivation',
      'Freshwater well access on property',
      'Low population density — slower initial infection spread',
    ],
    disadvantages: [
      'Lower conventional earning opportunities',
      'Substantial distance from hospitals and urban markets',
    ],
    worldWidth: 3000,
    groundY: 500,
  },

  SKYSCRAPER: {
    id: 'skyscraper',
    name: 'Metro Highrise',
    playable: false,
    comingSoon: true,
    tagline: 'Modern urban tower with rapid commercial access.',
    description: 'A residential apartment in the heart of the metropolitan district. Close to stores, high-paying corporate jobs, and emergency services.',
    advantages: [
      'High starting wage potential and commercial proximity',
      'Immediate access to urban pharmacies and supermarkets',
    ],
    disadvantages: [
      'Extreme population density and bottlenecked stairwells',
      'Zero soil for independent food production',
    ],
  },

  OLD_TOWN: {
    id: 'old_town',
    name: 'Historic Old Town',
    playable: false,
    comingSoon: true,
    tagline: 'Close-knit community of shops, workshops, and neighbors.',
    description: 'A picturesque cobblestone borough with active local commerce, artisan workshops, and dense social networks.',
    advantages: [
      'Abundant NPC interactions and community bartering',
      'Nearby workshops and craft supply stores',
    ],
    disadvantages: [
      'High social exposure during initial contamination',
      'Aggressive competition for neighborhood supplies',
    ],
  },

  CARAVAN: {
    id: 'caravan',
    name: 'Wanderer Caravan',
    playable: false,
    comingSoon: true,
    tagline: 'Mobile camper trailer ready to relocate on short notice.',
    description: 'A retrofitted camper van parked near the outskirts. Offers agility and mobility at the expense of storage and security.',
    advantages: [
      'Strategic mobility and relocation capability',
      'Minimal footprint and low visibility',
    ],
    disadvantages: [
      'Severe storage restrictions and fragile defenses',
      'Constant fuel, battery, and engine maintenance',
    ],
  },
};

/**
 * Get all starting locations.
 * @returns {Array<object>}
 */
export function getAllLocations() {
  return Object.values(LOCATIONS);
}

/**
 * Get location by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getLocation(id) {
  return LOCATIONS[id.toUpperCase()] || null;
}
