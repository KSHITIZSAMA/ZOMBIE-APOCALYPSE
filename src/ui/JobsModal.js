/**
 * JobsModal — Employment board for earning money and consuming time/energy.
 */

import { getAllJobs } from '../data/jobs.js';

export class JobsModal {
  /**
   * @param {HTMLElement} container
   * @param {object} context
   * @param {import('../entities/Player.js').Player} context.player
   * @param {import('../core/NeedsSystem.js').NeedsSystem} context.needs
   * @param {Function} context.onWorkJob - (job) => void
   * @param {Function} context.onClose
   */
  constructor(container, { player, needs, onWorkJob, onClose }) {
    this.container = container;
    this.player = player;
    this.needs = needs;
    this.onWorkJob = onWorkJob;
    this.onClose = onClose;

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
    if (this.onClose) this.onClose();
  }

  _buildUI() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay jobs-overlay';

    const jobs = getAllJobs();
    const isExhausted = this.needs.fatigue >= 85;

    overlay.innerHTML = `
      <div class="jobs-panel">
        <header class="jobs-header">
          <div>
            <h2 class="jobs-title">Daily Work & Contracts</h2>
            <p class="jobs-subtitle">Earn vital funds before the world changes. Consumes in-game time and energy.</p>
          </div>
          <span class="fatigue-status ${isExhausted ? 'exhausted' : ''}">
            Fatigue: ${Math.round(this.needs.fatigue)}% ${isExhausted ? '(Exhausted)' : ''}
          </span>
        </header>

        <div class="jobs-list">
          ${jobs.map((job) => {
            const hasRequirement = !job.requiredOccupation || job.requiredOccupation === this.player.occupation;
            const reward = job.getReward(this.player);
            const canWork = hasRequirement && !isExhausted;

            return `
              <div class="job-card ${hasRequirement ? '' : 'locked'}">
                <div class="job-card-header">
                  <h4 class="job-title">${job.title}</h4>
                  <span class="job-reward">+$${reward}</span>
                </div>
                <p class="job-desc">${job.description}</p>
                <div class="job-specs">
                  <span>⏱️ Duration: <strong>${job.durationHours} Hours</strong></span>
                  <span>⚡ Fatigue Cost: <strong>+${job.fatigueCost}%</strong></span>
                  ${job.requiredOccupation ? `
                    <span class="req-badge ${hasRequirement ? 'req-met' : 'req-unmet'}">
                      Requires: ${job.requiredOccupation.toUpperCase()}
                    </span>
                  ` : ''}
                </div>
                <button type="button" class="btn btn-primary btn-sm btn-work" data-id="${job.id}" ${canWork ? '' : 'disabled'}>
                  ${isExhausted ? 'Too Exhausted' : hasRequirement ? `Work Shift ($${reward})` : 'Occupation Locked'}
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <footer class="jobs-footer">
          <button type="button" id="btn-close-jobs" class="btn btn-secondary">Close</button>
        </footer>
      </div>
    `;

    return overlay;
  }

  _bindEvents() {
    this._element.querySelector('#btn-close-jobs').addEventListener('click', () => {
      this.close();
    });

    this._element.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-work');
      if (!btn || btn.disabled) return;
      const jobId = btn.dataset.id;
      const job = getAllJobs().find((j) => j.id === jobId);
      if (job) {
        this.close();
        this.onWorkJob(job);
      }
    });
  }
}
