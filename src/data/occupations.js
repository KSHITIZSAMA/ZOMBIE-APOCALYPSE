/**
 * Occupations definition.
 * Fully implements Farmer, Electrician, Writer.
 * Mechanic, Carpenter, Doctor marked as coming soon.
 */

export const OCCUPATIONS = {
  FARMER: {
    id: 'farmer',
    name: 'Farmer',
    available: true,
    description: 'Experienced in agricultural labor and rural self-sufficiency. Highly efficient at cultivating crops and managing soil.',
    startingMoney: 400,
    skills: {
      farming: 30,
      scavenging: 10,
      crafting: 10,
      electrical: 0,
    },
    perks: ['+25% Crop Growth Efficiency', 'Access to Agricultural Jobs'],
    startingClothing: {
      shirtColor: '#4d684e',
      pantsColor: '#3c4a3b',
      clothingStyle: 'workwear',
    },
  },

  ELECTRICIAN: {
    id: 'electrician',
    name: 'Electrician',
    available: true,
    description: 'Certified technician skilled in wiring, electrical repair, and generator maintenance. Commands higher technical wages.',
    startingMoney: 650,
    skills: {
      farming: 0,
      scavenging: 10,
      crafting: 15,
      electrical: 35,
    },
    perks: ['Electrical Infrastructure Mastery', 'Access to Technical Repair Jobs'],
    startingClothing: {
      shirtColor: '#7a5a3a',
      pantsColor: '#2f3b48',
      clothingStyle: 'jacket',
    },
  },

  WRITER: {
    id: 'writer',
    name: 'Writer',
    available: true,
    description: 'Observant freelance author who values quiet isolation. Generates freelance income and spots subtle anomalies in the world.',
    startingMoney: 500,
    skills: {
      farming: 5,
      scavenging: 15,
      crafting: 5,
      electrical: 0,
    },
    perks: ['Perceptive Observer', 'Freelance Writing Income'],
    startingClothing: {
      shirtColor: '#535b68',
      pantsColor: '#2b2c34',
      clothingStyle: 'casual',
    },
  },

  MECHANIC: {
    id: 'mechanic',
    name: 'Mechanic',
    available: false,
    comingSoon: true,
    description: 'Vehicle restoration and heavy machinery specialist. (Available in future updates)',
    startingMoney: 550,
    skills: { farming: 0, scavenging: 15, crafting: 30, electrical: 15 },
    perks: ['Vehicle Repair', 'Scrap Metal Fabrication'],
  },

  CARPENTER: {
    id: 'carpenter',
    name: 'Carpenter',
    available: false,
    comingSoon: true,
    description: 'Woodworking expert capable of fortifying structures and building furniture. (Available in future updates)',
    startingMoney: 450,
    skills: { farming: 10, scavenging: 10, crafting: 35, electrical: 0 },
    perks: ['Fortification Reinforcement', 'Timber Crafting'],
  },

  DOCTOR: {
    id: 'doctor',
    name: 'Doctor',
    available: false,
    comingSoon: true,
    description: 'Medical professional knowledgeable in pharmaceuticals, trauma care, and infection treatment. (Available in future updates)',
    startingMoney: 900,
    skills: { farming: 0, scavenging: 20, crafting: 10, electrical: 0 },
    perks: ['Advanced Medical Care', 'Infection Resistance'],
  },
};

/**
 * Get list of all occupations.
 * @returns {Array<object>}
 */
export function getAllOccupations() {
  return Object.values(OCCUPATIONS);
}

/**
 * Get an occupation by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getOccupation(id) {
  return OCCUPATIONS[id.toUpperCase()] || null;
}
