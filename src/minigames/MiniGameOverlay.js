/**
 * MiniGameOverlay.js — Reusable DOM/CSS modal overlay for all mini-games.
 * Features hand-drawn gloomy aesthetics, instructions banner, progress tracker,
 * feedback notifications, assisted mode controls, and cancel buttons.
 */

export class MiniGameOverlay {
  /**
   * @param {HTMLElement} parentContainer - Container DOM element (e.g. #game-container).
   * @param {object} options
   * @param {string} options.title - Activity title.
   * @param {string} [options.subtitle] - Subtitle or occupation tag.
   * @param {string} options.instructions - Gameplay instructions.
   * @param {boolean} [options.assistedMode=false] - Current assisted mode state.
   * @param {boolean} [options.quickWorkAvailable=false] - Whether player can skip via mastery.
   * @param {Function} [options.onAssistedToggle] - Callback when toggling assisted mode.
   * @param {Function} [options.onQuickWork] - Callback when clicking quick work.
   * @param {Function} options.onCancel - Callback when cancelling/closing.
   */
  constructor(parentContainer, {
    title,
    subtitle = '',
    instructions,
    assistedMode = false,
    quickWorkAvailable = false,
    onAssistedToggle = null,
    onQuickWork = null,
    onCancel,
  }) {
    this.container = parentContainer;
    this.title = title;
    this.subtitle = subtitle;
    this.instructions = instructions;
    this.assistedMode = assistedMode;
    this.quickWorkAvailable = quickWorkAvailable;
    this.onAssistedToggle = onAssistedToggle;
    this.onQuickWork = onQuickWork;
    this.onCancel = onCancel;

    this._element = null;
    this._stageElement = null;
    this._feedbackElement = null;
    this._progressElement = null;
    this._progressText = null;
    this._assistedBtn = null;
    this._quickWorkBtn = null;
  }

  /**
   * Mount overlay to the DOM.
   */
  mount() {
    if (this._element) return;

    const overlay = document.createElement('div');
    overlay.className = 'overlay minigame-overlay';
    overlay.id = 'minigame-overlay';
    overlay.setAttribute('data-testid', 'minigame-overlay');

    overlay.innerHTML = `
      <div class="minigame-panel">
        <header class="minigame-header">
          <div class="minigame-header-titles">
            <span class="minigame-tag" data-testid="minigame-tag">${this.subtitle || 'Activity'}</span>
            <h2 class="minigame-title" data-testid="minigame-title">${this.title}</h2>
          </div>
          <div class="minigame-header-actions">
            <button
              class="minigame-btn minigame-assisted-btn ${this.assistedMode ? 'active' : ''}"
              id="minigame-assisted-toggle"
              data-testid="minigame-assisted-toggle"
              title="Toggle Assisted Mode for reduced speed and wider tolerance"
            >
              ♿ Assisted: <strong>${this.assistedMode ? 'ON' : 'OFF'}</strong>
            </button>
            <button
              class="minigame-close-btn"
              id="minigame-cancel-btn"
              data-testid="minigame-cancel-btn"
              title="Cancel Activity (Escape)"
            >✕</button>
          </div>
        </header>

        <div class="minigame-instructions-banner" data-testid="minigame-instructions">
          <span class="minigame-info-icon">💡</span>
          <span class="minigame-instructions-text">${this.instructions}</span>
        </div>

        <div class="minigame-stage-wrapper">
          <div class="minigame-stage" id="minigame-stage" data-testid="minigame-stage"></div>
        </div>

        <div class="minigame-progress-row">
          <div class="minigame-progress-track">
            <div class="minigame-progress-fill" id="minigame-progress" data-testid="minigame-progress" style="width: 0%;"></div>
          </div>
          <span class="minigame-progress-text" id="minigame-progress-text">Ready</span>
        </div>

        <div class="minigame-feedback hidden" id="minigame-feedback" data-testid="minigame-feedback"></div>

        <footer class="minigame-footer">
          <button
            class="minigame-btn minigame-quickwork-btn ${this.quickWorkAvailable ? '' : 'hidden'}"
            id="minigame-quickwork-btn"
            data-testid="minigame-quickwork-btn"
            title="Complete instantly with mastery (Standard reward)"
          >
            ⚡ Quick Work
          </button>
          <div class="minigame-footer-actions">
            <button
              class="minigame-btn minigame-btn-secondary"
              id="minigame-return-btn"
              data-testid="minigame-return-btn"
            >
              Cancel Activity
            </button>
            <button
              class="minigame-btn minigame-btn-primary hidden"
              id="minigame-action-btn"
              data-testid="minigame-action-btn"
            >
              Action
            </button>
          </div>
        </footer>
      </div>
    `;

    this.container.appendChild(overlay);
    this._element = overlay;

    // Grab dynamic references
    this._stageElement = overlay.querySelector('#minigame-stage');
    this._feedbackElement = overlay.querySelector('#minigame-feedback');
    this._progressElement = overlay.querySelector('#minigame-progress');
    this._progressText = overlay.querySelector('#minigame-progress-text');
    this._assistedBtn = overlay.querySelector('#minigame-assisted-toggle');
    this._quickWorkBtn = overlay.querySelector('#minigame-quickwork-btn');

    this._bindEvents();
  }

  /**
   * Bind event listeners for overlay controls.
   * @private
   */
  _bindEvents() {
    if (!this._element) return;

    // Cancel buttons
    const cancelBtn = this._element.querySelector('#minigame-cancel-btn');
    const returnBtn = this._element.querySelector('#minigame-return-btn');
    const handleCancel = () => {
      if (this.onCancel) this.onCancel();
    };

    cancelBtn?.addEventListener('click', handleCancel);
    returnBtn?.addEventListener('click', handleCancel);

    // Assisted Mode toggle
    this._assistedBtn?.addEventListener('click', () => {
      this.assistedMode = !this.assistedMode;
      if (this._assistedBtn) {
        this._assistedBtn.classList.toggle('active', this.assistedMode);
        this._assistedBtn.innerHTML = `♿ Assisted: <strong>${this.assistedMode ? 'ON' : 'OFF'}</strong>`;
      }
      if (this.onAssistedToggle) {
        this.onAssistedToggle(this.assistedMode);
      }
    });

    // Quick Work button
    this._quickWorkBtn?.addEventListener('click', () => {
      if (this.onQuickWork) {
        this.onQuickWork();
      }
    });

    // Keyboard Escape to cancel
    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Get the interactive container where mini-game templates mount.
   * @returns {HTMLElement}
   */
  getStageElement() {
    return this._stageElement;
  }

  /**
   * Update visual progress bar and text.
   * @param {number} percentage - 0 to 100.
   * @param {string} [label] - Optional status text.
   */
  setProgress(percentage, label = '') {
    const p = Math.max(0, Math.min(100, percentage));
    if (this._progressElement) {
      this._progressElement.style.width = `${p}%`;
    }
    if (this._progressText && label) {
      this._progressText.textContent = label;
    }
  }

  /**
   * Display atmospheric feedback toast/message.
   * @param {string} message
   * @param {'info'|'success'|'danger'} [type='info']
   */
  setFeedback(message, type = 'info') {
    if (!this._feedbackElement) return;

    if (!message) {
      this._feedbackElement.classList.add('hidden');
      return;
    }

    this._feedbackElement.textContent = message;
    this._feedbackElement.className = `minigame-feedback minigame-feedback-${type}`;
    this._feedbackElement.classList.remove('hidden');
  }

  /**
   * Configure primary action button.
   * @param {string} label
   * @param {Function} onClick
   */
  setActionButton(label, onClick) {
    const btn = this._element?.querySelector('#minigame-action-btn');
    if (!btn) return;

    if (!label) {
      btn.classList.add('hidden');
      return;
    }

    btn.textContent = label;
    btn.classList.remove('hidden');
    btn.onclick = onClick;
  }

  /**
   * Remove overlay from DOM and unbind listeners.
   */
  unmount() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._element = null;
    this._stageElement = null;
  }
}
