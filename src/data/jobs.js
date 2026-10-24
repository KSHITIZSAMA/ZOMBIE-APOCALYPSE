/**
 * Jobs definitions for Before the Dead.
 * Defines duration, energy/fatigue costs, requirements, and monetary rewards.
 */

export const JOBS = {
  FARM_HAND: {
    id: 'farm_hand',
    title: 'Agricultural Field Labor',
    durationHours: 4,
    fatigueCost: 28,
    basePay: 60,
    requiredOccupation: null, // Open to all
    description: 'Manual labor assisting neighboring rural homesteads with weeding, soil turning, and hauling produce.',
    getReward: (player) => {
      // Farmer perk gives +25% bonus income
      const bonus = player.occupation === 'farmer' ? 15 : 0;
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
    description: 'Research and author an insightful article regarding regional rumors for the county chronicle.',
    getReward: () => 85,
  },
};

/**
 * Get job by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getJob(id) {
  return JOBS[id.toUpperCase()] || null;
}

/**
 * Get all available jobs.
 * @returns {Array<object>}
 */
export function getAllJobs() {
  return Object.values(JOBS);
}
