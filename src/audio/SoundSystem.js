/**
 * SoundSystem — Procedural Web Audio API sound generator.
 * Produces crisp, atmospheric, vintage indie sound effects without any external audio files.
 * Supports melee swings, zombie groans, siren klaxons, truck engines, and UI chimes.
 */

export class SoundSystem {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;

    /** @type {GainNode|null} */
    this.masterGain = null;

    /** @type {boolean} */
    this.muted = false;

    // Check localStorage preference if available
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('before_the_dead_muted');
        if (stored !== null) {
          this.muted = stored === 'true';
        }
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Lazily initialize AudioContext on user interaction.
   * @private
   */
  _ensureContext() {
    if (this.muted) return false;

    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return Boolean(this.ctx);
  }

  /**
   * Toggle mute state.
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.muted = !this.muted;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('before_the_dead_muted', String(this.muted));
      }
    } catch {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
    }

    return this.muted;
  }

  /**
   * Sound: Melee whoosh swing.
   */
  playMeleeSwing() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  /**
   * Sound: Melee impact punchy thud.
   */
  playHit() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Sound: Guttural zombie moan or screech.
   * @param {boolean} [isRunner]
   */
  playZombieGroan(isRunner = false) {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const baseFreq = isRunner ? 160 : 85;
    const duration = isRunner ? 0.35 : 0.65;

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.linearRampToValueAtTime(baseFreq + (isRunner ? 40 : 15), now + duration * 0.5);
    osc1.frequency.linearRampToValueAtTime(baseFreq - 20, now + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc2.frequency.linearRampToValueAtTime(baseFreq * 1.2, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isRunner ? 750 : 380, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
  }

  /**
   * Sound: Emergency siren klaxon.
   */
  playSiren() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const duration = 2.4;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    for (let i = 0; i < 4; i++) {
      const step = now + i * 0.6;
      osc.frequency.setValueAtTime(520, step);
      osc.frequency.linearRampToValueAtTime(840, step + 0.3);
      osc.frequency.linearRampToValueAtTime(520, step + 0.6);
    }

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain.gain.setValueAtTime(0.3, now + duration - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Sound: Wooden barricade hammer impact.
   */
  playHammer() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Sound: Cash earnings chime.
   */
  playCash() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const playChime = (freq, offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.36);
    };

    playChime(987.77, 0);    // B5
    playChime(1318.51, 0.08); // E6
  }

  /**
   * Sound: Water pump gulp.
   */
  playWater() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Sound: Subtle UI click.
   */
  playClick() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Sound: Truck engine ignition revving.
   */
  playEngine() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const duration = 2.2;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.8);
    osc.frequency.linearRampToValueAtTime(140, now + 1.4);
    osc.frequency.linearRampToValueAtTime(110, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.4);
    gain.gain.setValueAtTime(0.5, now + duration - 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Sound: Triumphant escape fanfare.
   */
  playVictory() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const notes = [
      { freq: 261.63, time: 0 },    // C4
      { freq: 329.63, time: 0.15 }, // E4
      { freq: 392.00, time: 0.3 },  // G4
      { freq: 523.25, time: 0.48 }, // C5
    ];

    notes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now + n.time);
      gain.gain.setValueAtTime(0.35, now + n.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + n.time);
      osc.stop(now + n.time + 0.75);
    });
  }

  /**
   * Sound: Solemn Game Over chord.
   */
  playGameOver() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    const chords = [146.83, 174.61, 220.00]; // D minor
    chords.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 2.0);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 2.2);
    });
  }
}
