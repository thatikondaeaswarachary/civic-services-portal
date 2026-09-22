import { fetchRequestStatus, announceToScreenReader, ServiceRequest } from '../api/client.js';

export class StatusWidget {
  private element: HTMLElement;
  private inputField!: HTMLInputElement;
  private resultContainer!: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'card-surface';
    this.element.id = 'status-section';
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="card-header">
        <h2 class="card-title" style="font-size: var(--font-size-xl);">
          <span aria-hidden="true">🔍</span>
          <span>Lookup Ticket Status</span>
        </h2>
        <p class="card-subtitle">
          Track real-time progress for any active or resolved 311 request.
        </p>
      </div>

      <form id="status-lookup-form" novalidate>
        <div class="form-group">
          <label for="tracking-lookup-input" class="form-label">
            Service Tracking ID
          </label>
          <div style="display: flex; gap: 0.5rem;">
            <input
              type="text"
              id="tracking-lookup-input"
              class="form-control"
              placeholder="e.g., NYC-2026-1001"
              aria-describedby="tracking-input-hint"
              autocomplete="off"
            />
            <button
              type="submit"
              class="btn-primary"
              id="btn-lookup-status"
              style="padding: 0.75rem 1.25rem;"
            >
              Lookup
            </button>
          </div>
          <span id="tracking-input-hint" class="form-hint">
            Format: NYC-YYYY-XXXX. Try demo tickets: 
            <button type="button" class="btn-demo-link" data-ticket="NYC-2026-1001" style="background:none; border:none; color:var(--color-primary-600); text-decoration:underline; cursor:pointer; font-size:inherit; font-family:inherit;">NYC-2026-1001</button> or 
            <button type="button" class="btn-demo-link" data-ticket="NYC-2026-2045" style="background:none; border:none; color:var(--color-primary-600); text-decoration:underline; cursor:pointer; font-size:inherit; font-family:inherit;">NYC-2026-2045</button>.
          </span>
        </div>
      </form>

      <!-- Live Region for Result Output -->
      <div
        id="status-output-region"
        class="status-result-panel"
        style="display: none;"
        aria-live="polite"
        aria-atomic="true"
      ></div>
    `;

    this.inputField = this.element.querySelector('#tracking-lookup-input') as HTMLInputElement;
    this.resultContainer = this.element.querySelector('#status-output-region') as HTMLElement;
  }

  private bindEvents(): void {
    const form = this.element.querySelector('#status-lookup-form') as HTMLFormElement;
    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      this.lookup(this.inputField.value);
    });

    // Handle demo ticket quick-click buttons
    this.element.querySelectorAll<HTMLButtonElement>('.btn-demo-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const ticketId = btn.getAttribute('data-ticket') || '';
        this.inputField.value = ticketId;
        this.lookup(ticketId);
      });
    });
  }

  public setTrackingId(id: string): void {
    this.inputField.value = id;
    this.lookup(id);
  }

  public async lookup(trackingId: string): Promise<void> {
    const query = trackingId.trim();
    if (!query) {
      this.renderError('Please provide a tracking number to look up.');
      return;
    }

    this.resultContainer.style.display = 'block';
    this.resultContainer.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Querying municipal dispatch ledger for ${query}...</p>`;
    announceToScreenReader(`Searching for service request ${query}`);

    try {
      const ticket = await fetchRequestStatus(query);
      this.renderTicket(ticket);
      announceToScreenReader(`Found service request ${ticket.trackingId}. Current status is ${ticket.status}.`);
    } catch (err: any) {
      this.renderError(err.message);
      announceToScreenReader(`Lookup failed: ${err.message}`);
    }
  }

  private renderError(message: string): void {
    this.resultContainer.style.display = 'block';
    this.resultContainer.innerHTML = `
      <div style="color: var(--color-error-text); font-size: var(--font-size-sm); font-weight: 600;">
        ⚠️ ${message}
      </div>
    `;
  }

  private renderTicket(ticket: ServiceRequest): void {
    this.resultContainer.style.display = 'block';
    const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    this.resultContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
        <div>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 600;">TRACKING ID</span>
          <h3 style="font-size: var(--font-size-lg); font-weight: 800; color: var(--color-primary-900);">${ticket.trackingId}</h3>
        </div>
        <span class="status-badge status-${ticket.status}">
          ${ticket.status.replace('_', ' ')}
        </span>
      </div>

      <div style="font-size: var(--font-size-sm); margin-bottom: 0.75rem;">
        <strong>Service:</strong> ${ticket.serviceName}<br />
        <strong>Location:</strong> ${ticket.address} (${ticket.borough})<br />
        <strong>Submitted:</strong> ${formattedDate}
      </div>

      <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: 1rem; border-left: 2px solid var(--color-border-strong); padding-left: 0.5rem;">
        "${ticket.description}"
      </div>

      <h4 style="font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin-bottom: 0.5rem;">
        Audit Timeline & Agency Dispatch
      </h4>

      <ol class="timeline-list">
        ${ticket.timeline.map(event => `
          <li class="timeline-item">
            <div class="timeline-time">${new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${event.actor}</div>
            <div class="timeline-desc">${event.description}</div>
          </li>
        `).join('')}
      </ol>
    `;
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
