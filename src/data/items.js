/**
 * Items definition for Before the Dead.
 * Includes Food, Drinks, Seeds, Produce, Tools, and Crafting Materials.
 */

export const ITEMS = {
  // --- Food & Drinks ---
  CANNED_FOOD: {
    id: 'canned_food',
    name: 'Canned Stew',
    category: 'food',
    description: 'Preserved hearty beef and vegetable stew. Long shelf-life.',
    price: 16,
    sellPrice: 8,
    stackMax: 10,
    effects: {
      hunger: -35,
    },
  },

  BREAD: {
    id: 'bread',
    name: 'Loaf of Bread',
    category: 'food',
    description: 'Fresh baked crusty bread. Satisfying and nutritious.',
    price: 10,
    sellPrice: 5,
    stackMax: 10,
    effects: {
      hunger: -25,
    },
  },

  WATER_BOTTLE: {
    id: 'water_bottle',
    name: 'Clean Water Bottle',
    category: 'drink',
    description: 'Purified spring water. Crucial for daily survival.',
    price: 8,
    sellPrice: 4,
    stackMax: 15,
    effects: {
      thirst: -45,
    },
  },

  // --- Seeds ---
  CORN_SEED: {
    id: 'corn_seed',
    name: 'Sweet Corn Seeds',
    category: 'seed',
    description: 'Pack of heirloom sweet corn seeds for garden cultivation.',
    price: 6,
    sellPrice: 3,
    stackMax: 20,
    cropData: {
      cropId: 'corn',
      cropName: 'Sweet Corn',
      growthHours: 24,
      harvestYield: 3,
    },
  },

  TOMATO_SEED: {
    id: 'tomato_seed',
    name: 'Vine Tomato Seeds',
    category: 'seed',
    description: 'Juicy vine tomato seeds. Fast growing in moist soil.',
    price: 5,
    sellPrice: 2,
    stackMax: 20,
    cropData: {
      cropId: 'tomato',
      cropName: 'Vine Tomato',
      growthHours: 18,
      harvestYield: 2,
    },
  },

  // --- Harvested Produce ---
  CORN: {
    id: 'corn',
    name: 'Sweet Corn Ear',
    category: 'produce',
    description: 'Freshly harvested golden corn cob. Can be eaten or sold.',
    price: 14,
    sellPrice: 9,
    stackMax: 20,
    effects: {
      hunger: -20,
    },
  },

  TOMATO: {
    id: 'tomato',
    name: 'Vine Tomato',
    category: 'produce',
    description: 'Ripe red tomato rich in moisture and nutrients.',
    price: 12,
    sellPrice: 7,
    stackMax: 20,
    effects: {
      hunger: -15,
      thirst: -12,
    },
  },

  // --- Tools & Materials ---
  WOOD: {
    id: 'wood',
    name: 'Timber Plank',
    category: 'material',
    description: 'Seasoned pine lumber. Essential for construction and barricades.',
    price: 15,
    sellPrice: 8,
    stackMax: 30,
  },

  HAND_TROWEL: {
    id: 'hand_trowel',
    name: 'Farming Trowel',
    category: 'tool',
    description: 'Sturdy steel gardening trowel for preparing and tending soil.',
    price: 25,
    sellPrice: 12,
    stackMax: 1,
  },

  // --- Evacuation & Vehicle Components ---
  CAR_BATTERY: {
    id: 'car_battery',
    name: '12V Truck Battery',
    category: 'material',
    description: 'Heavy lead-acid vehicle battery with intact charge. Powers automotive starter motors.',
    price: 85,
    sellPrice: 40,
    stackMax: 1,
  },

  FUEL_CAN: {
    id: 'fuel_can',
    name: 'Jerrycan of Gasoline',
    category: 'material',
    description: '5 gallons of stabilized vehicle fuel. Essential for long-distance escape.',
    price: 60,
    sellPrice: 30,
    stackMax: 3,
  },
};

/**
 * Get item by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getItem(id) {
  return ITEMS[id.toUpperCase()] || null;
}

/**
 * Get list of all items.
 * @returns {Array<object>}
 */
export function getAllItems() {
  return Object.values(ITEMS);
}

/**
 * Get shop inventory catalog.
 * @returns {Array<object>}
 */
export function getShopCatalog() {
  return [
    ITEMS.CANNED_FOOD,
    ITEMS.BREAD,
    ITEMS.WATER_BOTTLE,
    ITEMS.CORN_SEED,
    ITEMS.TOMATO_SEED,
    ITEMS.WOOD,
    ITEMS.HAND_TROWEL,
    ITEMS.FUEL_CAN,
    ITEMS.CAR_BATTERY,
  ];
}
