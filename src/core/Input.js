/**
 * Input — Keyboard input handler.
 * Tracks key states and provides query methods.
 */

export class Input {
  constructor() {
    /** @type {Set<string>} Currently held keys */
    this._held = new Set();

    /** @type {Set<string>} Keys pressed this frame (consumed on read) */
    this._justPressed = new Set();

    /** @type {Set<string>} Keys released this frame */
    this._justReleased = new Set();

    // Bind handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);

    this._attached = false;
  }

  /**
   * Attach event listeners to the document.
   */
  attach() {
    if (this._attached) return;
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this._onKeyDown);
      document.addEventListener('keyup', this._onKeyUp);
      document.addEventListener('mousedown', this._onMouseDown);
      this._attached = true;
    }
  }

  /**
   * Detach event listeners.
   */
  detach() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._onKeyDown);
      document.removeEventListener('keyup', this._onKeyUp);
      document.removeEventListener('mousedown', this._onMouseDown);
    }
    this._attached = false;
  }

  /**
   * Clear per-frame transient state. Call at end of each game update.
   */
  endFrame() {
    this._justPressed.clear();
    this._justReleased.clear();
  }

  /**
   * Check if a key is currently held.
   * @param {string} key
   * @returns {boolean}
   */
  isHeld(key) {
    const k = key === ' ' ? 'space' : key.toLowerCase();
    return this._held.has(k);
  }

  /**
   * Check if a key was just pressed this frame.
   * @param {string} key
   * @returns {boolean}
   */
  isJustPressed(key) {
    const k = key === ' ' ? 'space' : key.toLowerCase();
    return this._justPressed.has(k);
  }

  /**
   * Check if player pressed attack (Space or Left Click).
   * @returns {boolean}
   */
  isAttacking() {
    return this.isJustPressed('space') || this.isJustPressed('attack') || this.isJustPressed(' ');
  }

  /**
   * Check if player is pressing left movement keys.
   * @returns {boolean}
   */
  isMovingLeft() {
    return this._held.has('a') || this._held.has('arrowleft');
  }

  /**
   * Check if player is pressing right movement keys.
   * @returns {boolean}
   */
  isMovingRight() {
    return this._held.has('d') || this._held.has('arrowright');
  }

  /**
   * @param {KeyboardEvent} e
   * @private
   */
  _onKeyDown(e) {
    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';

    if (!this._held.has(key)) {
      this._justPressed.add(key);
    }
    this._held.add(key);

    // Prevent default for game keys
    const gameKeys = ['a', 'd', 'arrowleft', 'arrowright', 'e', 'i', 'c', 'm', 'escape', 'f1', 'space'];
    if (gameKeys.includes(key)) {
      e.preventDefault();
    }
  }

  /**
   * @param {KeyboardEvent} e
   * @private
   */
  _onKeyUp(e) {
    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';

    this._held.delete(key);
    this._justReleased.add(key);
  }

  /**
   * @param {MouseEvent} e
   * @private
   */
  _onMouseDown(e) {
    // Only capture left clicks on the canvas / game container
    if (e.button === 0) {
      const target = e.target;
      if (target && (target.id === 'game-canvas' || target.closest?.('#game-canvas'))) {
        this._justPressed.add('attack');
      }
    }
  }
}
