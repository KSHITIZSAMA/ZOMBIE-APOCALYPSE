/**
 * Seeded pseudo-random number generator (mulberry32).
 * All gameplay randomness must go through this module.
 */

/**
 * Create a seeded PRNG using mulberry32 algorithm.
 * @param {number} seed - The initial seed value.
 * @returns {object} PRNG interface with next(), float(), range(), getSeed(), getState(), setState()
 */
export function createRNG(seed) {
  let state = seed | 0; // Ensure integer

  /**
   * mulberry32 — returns next 32-bit integer and advances state.
   * @returns {number} Unsigned 32-bit integer
   */
  function nextInt() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0);
  }

  return {
    /**
     * Get a float in [0, 1).
     * @returns {number}
     */
    float() {
      return nextInt() / 4294967296;
    },

    /**
     * Get an integer in [min, max] inclusive.
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    range(min, max) {
      return min + (nextInt() % (max - min + 1));
    },

    /**
     * Get the original seed.
     * @returns {number}
     */
    getSeed() {
      return seed;
    },

    /**
     * Get current internal state (for saving).
     * @returns {number}
     */
    getState() {
      return state;
    },

    /**
     * Restore internal state (for loading).
     * @param {number} s
     */
    setState(s) {
      state = s | 0;
    },
  };
}

/**
 * Generate a random seed from system entropy (only for new game creation).
 * @returns {number}
 */
export function generateSeed() {
  return (Math.random() * 2147483647) | 0;
}
