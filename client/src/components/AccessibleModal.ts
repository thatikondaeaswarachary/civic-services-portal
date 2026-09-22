export class AccessibleModal {
  private dialogElement: HTMLDialogElement;
  private triggerElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private onSubmitCallback?: (formData: any) => void;

  constructor(onSubmit?: (formData: any) => void) {
    this.onSubmitCallback = onSubmit;
    this.dialogElement = document.createElement('dialog');
    this.dialogElement.className = 'accessible-modal-dialog';
    this.dialogElement.id = 'expedited-intake-dialog';
    this.dialogElement.setAttribute('aria-labelledby', 'modal-dialog-title');
    this.dialogElement.setAttribute('aria-describedby', 'modal-dialog-desc');
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.dialogElement.innerHTML = `
      <div class="modal-dialog-content">
        <div class="modal-dialog-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span aria-hidden="true" style="font-size: 1.25rem;">⚡</span>
            <h2 id="modal-dialog-title" class="modal-title">Expedited Civic Intake Dispatch</h2>
          </div>
          <button
            type="button"
            class="btn-modal-close"
            id="btn-close-modal"
            aria-label="Close expedited intake dialog"
          >
            ✕
          </button>
        </div>

        <p id="modal-dialog-desc" class="modal-description">
          Create an emergency or high-priority municipal dispatch ticket directly into the city operations ledger.
        </p>

        <form id="modal-intake-form" novalidate>
          <fieldset class="modal-fieldset">
            <legend class="modal-legend">Emergency Triage Category</legend>
            
            <div class="form-group">
              <label for="modal-service-type" class="form-label">
                Dispatched Agency Unit <span class="required-indicator" aria-hidden="true">*</span>
              </label>
              <select id="modal-service-type" class="form-control" required aria-required="true">
                <option value="srv-pothole">DOT - Roadway Hazard & Cave-in</option>
                <option value="srv-heat">HPD - Emergency Heat & Hot Water</option>
                <option value="srv-trees">DPR - Fallen Tree Obstruction</option>
                <option value="srv-trash">DSNY - Hazardous Waste Spill</option>
              </select>
            </div>

            <div class="form-group">
              <label for="modal-address" class="form-label">
                Critical Incident Location <span class="required-indicator" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="modal-address"
                class="form-control"
                placeholder="Exact building number or avenue intersection"
                required
                aria-required="true"
                autocomplete="street-address"
              />
            </div>

            <div class="form-group">
              <label for="modal-notes" class="form-label">
                Field Responder Directives
              </label>
              <textarea
                id="modal-notes"
                rows="3"
                class="form-control"
                placeholder="Include safety hazards, live traffic conditions, or immediate risks..."
              ></textarea>
            </div>
          </fieldset>

          <div class="modal-footer-actions">
            <button type="button" class="btn-secondary" id="btn-cancel-modal">
              Cancel
            </button>
            <button type="submit" class="btn-primary" id="btn-submit-modal">
              Confirm & Dispatch Unit
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private bindEvents(): void {
    const closeBtn = this.dialogElement.querySelector('#btn-close-modal') as HTMLButtonElement;
    const cancelBtn = this.dialogElement.querySelector('#btn-cancel-modal') as HTMLButtonElement;
    const form = this.dialogElement.querySelector('#modal-intake-form') as HTMLFormElement;

    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());

    // Native Esc key handling
    this.dialogElement.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });

    // Handle Tab key trapping
    this.dialogElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        this.handleTabTrap(e);
      }
    });

    form?.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const serviceType = (this.dialogElement.querySelector('#modal-service-type') as HTMLSelectElement).value;
      const address = (this.dialogElement.querySelector('#modal-address') as HTMLInputElement).value;
      const notes = (this.dialogElement.querySelector('#modal-notes') as HTMLTextAreaElement).value;

      if (!address || address.trim().length < 5) {
        alert('Please provide a specific street location (at least 5 characters).');
        return;
      }

      if (this.onSubmitCallback) {
        this.onSubmitCallback({ serviceType, address, notes });
      }
      this.close();
    });
  }

  private updateFocusableElements(): void {
    this.focusableElements = Array.from(
      this.dialogElement.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));
  }

  private handleTabTrap(e: KeyboardEvent): void {
    this.updateFocusableElements();
    if (this.focusableElements.length === 0) return;

    const first = this.focusableElements[0];
    const last = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }

  public open(trigger?: HTMLElement): void {
    this.triggerElement = trigger || null;
    if (typeof this.dialogElement.showModal === 'function') {
      this.dialogElement.showModal();
    } else {
      this.dialogElement.setAttribute('open', '');
    }

    this.updateFocusableElements();
    // Move focus to first input or close button
    const firstInput = this.dialogElement.querySelector<HTMLElement>('#modal-service-type') || this.focusableElements[0];
    setTimeout(() => firstInput?.focus(), 50);
  }

  public close(): void {
    if (typeof this.dialogElement.close === 'function') {
      this.dialogElement.close();
    } else {
      this.dialogElement.removeAttribute('open');
    }

    // Restore focus to triggering control (WCAG 2.4.3 Focus Order)
    if (this.triggerElement) {
      this.triggerElement.focus();
    }
  }

  public getElement(): HTMLDialogElement {
    return this.dialogElement;
  }
}
