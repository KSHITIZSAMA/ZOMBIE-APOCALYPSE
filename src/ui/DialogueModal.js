/**
 * DialogueModal — Reusable branching narrative choice interface.
 * Suspends ordinary gameplay, displays scene narration, speaker dialogue,
 * checks choice prerequisites, and presents outcome feedback.
 */

export class DialogueModal {
  /**
   * @param {HTMLElement} container
   * @param {object} eventDef - Story event definition
   * @param {object} game - Game instance to check prerequisites
   * @param {Function} onResolve - Callback(choiceId)
   */
  constructor(container, eventDef, game, onResolve) {
    this.container = container;
    this.eventDef = eventDef;
    this.game = game;
    this.onResolve = onResolve;

    this.selectedChoice = null;
    this._element = null;
  }

  open() {
    this._element = this._buildUI();
    this.container.appendChild(this._element);
    this._bindEvents();
  }

  close() {
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
      this._element = null;
    }
  }

  _buildUI() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay dialogue-overlay';

    overlay.innerHTML = `
      <div class="dialogue-panel">
        <header class="dialogue-header">
          <div class="speaker-tag">${this.eventDef.speaker}</div>
          <h2 class="dialogue-title">${this.eventDef.title}</h2>
        </header>

        <div class="dialogue-body">
          <p class="dialogue-narration">${this.eventDef.description}</p>
          <div class="dialogue-speech-bubble">
            <p class="dialogue-quote">${this.eventDef.dialogue}</p>
          </div>

          <div id="dialogue-choices" class="dialogue-choices-list">
            <h4 class="choices-prompt">How do you respond?</h4>
            ${this.eventDef.choices.map((choice) => {
              const meetsPrereq = !choice.prerequisite || choice.prerequisite(this.game);
              return `
                <button type="button" class="choice-btn ${meetsPrereq ? '' : 'disabled'}" data-choice-id="${choice.id}" ${meetsPrereq ? '' : 'disabled'}>
                  <span class="choice-text">${choice.text}</span>
                  ${choice.prerequisiteText && !meetsPrereq ? `
                    <span class="choice-prereq">⚠️ ${choice.prerequisiteText}</span>
                  ` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div id="dialogue-outcome" class="dialogue-outcome-box hidden">
            <h4 class="outcome-heading">Consequence</h4>
            <p id="outcome-text" class="outcome-body"></p>
            <button type="button" id="btn-dialogue-continue" class="btn btn-primary btn-large">Continue</button>
          </div>
        </div>
      </div>
    `;

    return overlay;
  }

  _bindEvents() {
    const choicesList = this._element.querySelector('#dialogue-choices');
    const outcomeBox = this._element.querySelector('#dialogue-outcome');
    const outcomeText = this._element.querySelector('#outcome-text');
    const continueBtn = this._element.querySelector('#btn-dialogue-continue');

    // Handle choice selection
    choicesList.addEventListener('click', (e) => {
      const btn = e.target.closest('.choice-btn');
      if (!btn || btn.disabled) return;

      const choiceId = btn.dataset.choiceId;
      const choice = this.eventDef.choices.find((c) => c.id === choiceId);
      if (!choice) return;

      this.selectedChoice = choice;

      // Apply resolution
      const res = this.onResolve(choiceId);

      // Hide choices, show outcome
      choicesList.classList.add('hidden');
      outcomeBox.classList.remove('hidden');
      outcomeText.textContent = res.outcomeText || choice.outcomeText;
    });

    // Continue button closes modal
    continueBtn.addEventListener('click', () => {
      this.close();
    });
  }
}
