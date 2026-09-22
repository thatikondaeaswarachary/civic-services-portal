import { TableRowData } from './DataTable.js';
import { AuthManager } from '../auth.js';
import { announceToScreenReader } from '../api/client.js';

export interface TicketUpdatePayload {
  trackingId: string;
  status: TableRowData['status'];
  urgency: TableRowData['urgency'];
  note?: string;
  author: string;
}

export class TicketDetailModal {
  private dialogElement: HTMLDialogElement;
  private currentTicket: TableRowData | null = null;
  private triggerElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private onUpdateCallback?: (updatedTicket: TableRowData, note?: string) => void;
  private onDeleteCallback?: (trackingId: string) => void;
  private authManager: AuthManager;
  private auditNotes: Array<{ author: string; text: string; timestamp: string }> = [];

  constructor(
    onUpdate?: (updatedTicket: TableRowData, note?: string) => void,
    onDelete?: (trackingId: string) => void
  ) {
    this.authManager = AuthManager.getInstance();
    this.onUpdateCallback = onUpdate;
    this.onDeleteCallback = onDelete;

    this.dialogElement = document.createElement('dialog');
    this.dialogElement.className = 'accessible-modal-dialog';
    this.dialogElement.id = 'ticket-detail-dialog';
    this.dialogElement.setAttribute('aria-labelledby', 'ticket-detail-title');
    this.dialogElement.setAttribute('aria-describedby', 'ticket-detail-desc');
  }

  public getElement(): HTMLDialogElement {
    return this.dialogElement;
  }

  public open(ticket: TableRowData, trigger?: HTMLElement): void {
    this.currentTicket = { ...ticket };
    this.triggerElement = trigger || null;
    
    // Seed audit note if empty
    if (this.auditNotes.length === 0) {
      this.auditNotes = [
        {
          author: 'System Intake Service',
          text: `Ticket successfully recorded via NYC 311 gateway for ${ticket.category}.`,
          timestamp: ticket.submittedAt || new Date().toISOString()
        }
      ];
    }

    this.render();
    this.bindEvents();

    if (typeof this.dialogElement.showModal === 'function') {
      this.dialogElement.showModal();
    } else {
      this.dialogElement.setAttribute('open', '');
    }

    this.cacheFocusableElements();
    const closeBtn = this.dialogElement.querySelector('#btn-close-ticket-detail') as HTMLElement;
    closeBtn?.focus();

    announceToScreenReader(`Opened ticket detail inspector for ${ticket.trackingId}. Press Escape to close.`);
  }

  public close(): void {
    if (typeof this.dialogElement.close === 'function') {
      this.dialogElement.close();
    } else {
      this.dialogElement.removeAttribute('open');
    }

    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      this.triggerElement.focus();
    }

    announceToScreenReader('Ticket detail inspector closed.');
  }

  private render(): void {
    if (!this.currentTicket) return;
    const ticket = this.currentTicket;
    const isDispatcher = this.authManager.isDispatcher();
    const currentUser = this.authManager.getCurrentUser();

    this.dialogElement.innerHTML = `
      <div class="modal-dialog-content" style="max-width: 640px;">
        <div class="modal-dialog-header">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span class="tracking-mono" style="font-size: 1.1rem; background: var(--color-primary-100); color: var(--color-primary-900); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); font-weight: 800;">
              ${ticket.trackingId}
            </span>
            <h2 id="ticket-detail-title" class="modal-title" style="font-size: 1.2rem;">
              Incident Record Inspector
            </h2>
          </div>
          <button
            type="button"
            class="btn-modal-close"
            id="btn-close-ticket-detail"
            aria-label="Close ticket detail inspector"
          >
            ✕
          </button>
        </div>

        <p id="ticket-detail-desc" class="modal-description">
          Detailed municipal record and lifecycle management for <strong>${ticket.category}</strong>.
        </p>

        <!-- Ticket Key Metrics Bar -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; background: var(--color-surface-subtle, rgba(0,0,0,0.02)); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <div>
            <div style="font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase;">Location</div>
            <div style="font-size: 0.9rem; font-weight: 700; color: var(--color-primary-900);">${ticket.address}</div>
            <span class="borough-tag">${ticket.borough}</span>
          </div>

          <div>
            <div style="font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase;">Current Status</div>
            <div style="margin-top: 0.2rem;">
              <span class="status-badge status-${ticket.status}">${ticket.status.replace('_', ' ')}</span>
            </div>
          </div>

          <div>
            <div style="font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase;">Urgency</div>
            <div style="margin-top: 0.2rem;">
              <span class="urgency-pill urgency-${ticket.urgency}">${ticket.urgency}</span>
            </div>
          </div>

          <div>
            <div style="font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase;">Logged At</div>
            <div style="font-size: 0.8rem; color: var(--color-primary-900); margin-top: 0.2rem;">
              ${new Date(ticket.submittedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <!-- Activity Timeline / Audit Trail -->
        <section aria-label="Incident activity timeline" style="margin-bottom: 1.25rem;">
          <h3 style="font-size: 0.9rem; font-weight: 800; color: var(--color-primary-900); margin-bottom: 0.5rem;">
            Activity & Audit Log (${this.auditNotes.length})
          </h3>
          <ul class="activity-timeline" style="list-style: none; padding: 0; margin: 0; max-height: 140px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.5rem;">
            ${this.auditNotes.map(n => `
              <li style="padding: 0.5rem; border-bottom: 1px solid var(--color-border); font-size: 0.8rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem;">
                  <strong style="color: var(--color-primary-800);">${n.author}</strong>
                  <span style="color: var(--color-text-muted); font-size: 0.7rem;">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style="color: var(--color-text-main);">${n.text}</div>
              </li>
            `).join('')}
          </ul>
        </section>

        <!-- Dynamic CRUD Operations based on Active Role -->
        <form id="ticket-action-form" novalidate>
          <fieldset class="modal-fieldset" style="margin-bottom: 1.25rem;">
            <legend class="modal-legend">
              ${isDispatcher ? '⚙️ Municipal Dispatcher Controls (Admin)' : '📝 Resident Remark & Follow-up'}
            </legend>

            ${isDispatcher ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem;">
                <div class="form-group">
                  <label for="edit-ticket-status" class="form-label">Update Status</label>
                  <select id="edit-ticket-status" class="form-control">
                    <option value="SUBMITTED" ${ticket.status === 'SUBMITTED' ? 'selected' : ''}>SUBMITTED</option>
                    <option value="RECEIVED" ${ticket.status === 'RECEIVED' ? 'selected' : ''}>RECEIVED</option>
                    <option value="DISPATCHED" ${ticket.status === 'DISPATCHED' ? 'selected' : ''}>DISPATCHED</option>
                    <option value="IN_PROGRESS" ${ticket.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                    <option value="RESOLVED" ${ticket.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="edit-ticket-urgency" class="form-label">Urgency Priority</label>
                  <select id="edit-ticket-urgency" class="form-control">
                    <option value="LOW" ${ticket.urgency === 'LOW' ? 'selected' : ''}>LOW</option>
                    <option value="MEDIUM" ${ticket.urgency === 'MEDIUM' ? 'selected' : ''}>MEDIUM</option>
                    <option value="HIGH" ${ticket.urgency === 'HIGH' ? 'selected' : ''}>HIGH</option>
                    <option value="EMERGENCY" ${ticket.urgency === 'EMERGENCY' ? 'selected' : ''}>EMERGENCY</option>
                  </select>
                </div>
              </div>
            ` : ''}

            <div class="form-group" style="margin-top: 0.5rem;">
              <label for="edit-ticket-note" class="form-label">
                ${isDispatcher ? 'Add Official Dispatch Note' : 'Add Resident Remark'}
              </label>
              <textarea
                id="edit-ticket-note"
                class="form-control"
                rows="2"
                placeholder="${isDispatcher ? 'e.g. Unit 4 dispatched to site for asphalt patch work.' : 'e.g. Street conditions worsening after recent storm.'}"
              ></textarea>
            </div>

            <button type="submit" class="btn-primary" style="margin-top: 0.5rem; width: 100%;">
              ${isDispatcher ? 'Save Status & Update Ledger' : 'Append Resident Remark'}
            </button>
          </fieldset>
        </form>

        <!-- CRUD Delete / Withdraw Region -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 1rem;">
          <button
            type="button"
            id="btn-delete-ticket"
            class="btn-danger"
            style="background: #ef4444; color: #ffffff; border: none; padding: 0.5rem 0.9rem; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;"
            aria-label="${isDispatcher ? 'Archive and delete this ticket from master ledger' : 'Withdraw this service request'}"
          >
            ${isDispatcher ? '🗑️ Archive & Delete Record' : '❌ Withdraw Request'}
          </button>

          <button type="button" class="btn-secondary" id="btn-close-ticket-footer">
            Close
          </button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const closeBtn = this.dialogElement.querySelector('#btn-close-ticket-detail');
    const closeFooterBtn = this.dialogElement.querySelector('#btn-close-ticket-footer');
    const actionForm = this.dialogElement.querySelector('#ticket-action-form') as HTMLFormElement;
    const deleteBtn = this.dialogElement.querySelector('#btn-delete-ticket');

    closeBtn?.addEventListener('click', () => this.close());
    closeFooterBtn?.addEventListener('click', () => this.close());

    actionForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.currentTicket) return;

      const isDispatcher = this.authManager.isDispatcher();
      const currentUser = this.authManager.getCurrentUser();
      const noteInput = this.dialogElement.querySelector('#edit-ticket-note') as HTMLTextAreaElement;
      const noteText = noteInput?.value.trim();

      if (isDispatcher) {
        const statusSelect = this.dialogElement.querySelector('#edit-ticket-status') as HTMLSelectElement;
        const urgencySelect = this.dialogElement.querySelector('#edit-ticket-urgency') as HTMLSelectElement;

        if (statusSelect) this.currentTicket.status = statusSelect.value as TableRowData['status'];
        if (urgencySelect) this.currentTicket.urgency = urgencySelect.value as TableRowData['urgency'];
      }

      if (noteText) {
        this.auditNotes.push({
          author: currentUser.name,
          text: noteText,
          timestamp: new Date().toISOString()
        });
      }

      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentTicket, noteText);
      }

      announceToScreenReader(`Ticket ${this.currentTicket.trackingId} updated successfully.`);
      this.close();
    });

    deleteBtn?.addEventListener('click', () => {
      if (!this.currentTicket) return;
      const isDispatcher = this.authManager.isDispatcher();
      const confirmMessage = isDispatcher
        ? `Are you sure you want to permanently archive and delete ticket ${this.currentTicket.trackingId}?`
        : `Are you sure you want to withdraw your service request ${this.currentTicket.trackingId}?`;

      if (window.confirm(confirmMessage)) {
        if (this.onDeleteCallback) {
          this.onDeleteCallback(this.currentTicket.trackingId);
        }
        announceToScreenReader(`Ticket ${this.currentTicket.trackingId} has been removed.`);
        this.close();
      }
    });

    this.dialogElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    });
  }

  private cacheFocusableElements(): void {
    const focusableSelectors = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const elements = Array.from(this.dialogElement.querySelectorAll(focusableSelectors)) as HTMLElement[];
    this.focusableElements = elements.filter(el => el.offsetParent !== null || el === this.dialogElement);
  }

  private trapFocus(e: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
}
