/**
 * Jobs definitions for Before the Dead.
 * Defines duration, energy/fatigue costs, requirements, mini-game mechanics, and monetary rewards.
 */

export const JOBS = {
  FARM_HAND: {
    id: 'farm_hand',
    title: 'Agricultural Field Labor',
    durationHours: 4,
    fatigueCost: 28,
    basePay: 60,
    requiredOccupation: null, // Open to all
    mechanic: 'timing_bar',
    skill: 'farming',
    description: 'Manual labor assisting neighboring rural homesteads with weeding, scythe reaping, and hauling produce.',
    getReward: (player) => {
      // Farmer perk gives +25% bonus income
      const bonus = player?.occupation === 'farmer' ? 15 : 0;
      return 60 + bonus;
    },
  },

  ELECTRICAL_REPAIR: {
    id: 'electrical_repair',
    title: 'Grid & Generator Maintenance',
    durationHours: 4,
    fatigueCost: 22,
    basePay: 110,
    requiredOccupation: 'electrician',
    mechanic: 'connect_match',
    skill: 'electrical',
    description: 'Technical contract diagnosing transformer lines and repairing faulty farm generator circuits.',
    getReward: () => 110,
  },

  FREELANCE_ARTICLE: {
    id: 'freelance_article',
    title: 'Investigative News Column',
    durationHours: 4,
    fatigueCost: 15,
    basePay: 85,
    requiredOccupation: 'writer',
    mechanic: 'ordered_sequence',
    skill: 'crafting',
    description: 'Research and author an insightful article regarding regional rumors for the county chronicle.',
    getReward: () => 85,
  },

  CARPENTRY_CONTRACT: {
    id: 'carpentry_contract',
    title: 'Lumber Timber Cutting & Joinery',
    durationHours: 3,
    fatigueCost: 22,
    basePay: 95,
    requiredOccupation: null,
    mechanic: 'timing_bar',
    skill: 'crafting',
    description: 'Precision timber sawing, structural framing, and joinery at the rural lumber yard.',
    getReward: (player) => {
      const bonus = player?.occupation === 'carpenter' ? 25 : 0;
      return 95 + bonus;
    },
  },

  SCAVENGER_HAUL: {
    id: 'scavenger_haul',
    title: 'Ruin Salvage & Scrap Yard',
    durationHours: 4,
    fatigueCost: 26,
    basePay: 80,
    requiredOccupation: null,
    mechanic: 'grid_selection',
    skill: 'scavenging',
    description: 'Sift through abandoned industrial salvage yards to recover reusable scrap and components.',
    getReward: (player) => {
      const bonus = player?.traits?.includes('scavenger') ? 20 : 0;
      return 80 + bonus;
    },
  },

  MEDICAL_TRIAGE: {
    id: 'medical_triage',
    title: 'Rural Clinic First Aid & Triage',
    durationHours: 3,
    fatigueCost: 18,
    basePay: 120,
    requiredOccupation: null,
    mechanic: 'ordered_sequence',
    skill: 'crafting',
    description: 'Assist the overworked county health station with wound cleaning, antiseptics, and suturing.',
    getReward: (player) => {
      const bonus = player?.occupation === 'doctor' ? 30 : 0;
      return 120 + bonus;
    },
  },

  COURIER_CARGO: {
    id: 'courier_cargo',
    title: 'Depot Logistics & Cargo Stacking',
    durationHours: 3,
    fatigueCost: 20,
    basePay: 90,
    requiredOccupation: null,
    mechanic: 'pack_fit',
    skill: 'crafting',
    description: 'Organize, weight-balance, and load emergency supply crates into regional transport vans.',
    getReward: () => 90,
  },
};

/**
 * Get job by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getJob(id) {
  if (!id) return null;
  const upper = id.toUpperCase();
  if (JOBS[upper]) return JOBS[upper];
  return Object.values(JOBS).find((j) => j.id === id) || null;
}

/**
 * Get all available jobs.
 * @returns {Array<object>}
 */
export function getAllJobs() {
  return Object.values(JOBS);
}
