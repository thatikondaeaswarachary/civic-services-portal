import { CivicService, submitServiceRequest, announceToScreenReader } from '../api/client.js';

export class EnterpriseForm {
  private element: HTMLElement;
  private services: CivicService[] = [];
  private onTicketCreatedCallback?: (ticket: any) => void;

  constructor(services: CivicService[], onCreated?: (ticket: any) => void) {
    this.services = services;
    this.onTicketCreatedCallback = onCreated;
    this.element = document.createElement('section');
    this.element.className = 'card-surface enterprise-form-section';
    this.element.setAttribute('aria-labelledby', 'enterprise-form-title');
    this.render();
    this.bindEvents();
  }

  public updateServices(services: CivicService[]): void {
    this.services = services;
    const select = this.element.querySelector('#service-category-select') as HTMLSelectElement;
    if (select) {
      select.innerHTML = `
        <option value="">-- Choose Municipal Service Department --</option>
        ${services.map(s => `<option value="${s.id}">${s.name} (${s.agency})</option>`).join('')}
      `;
    }
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="card-header">
        <h2 id="enterprise-form-title" class="card-title">
          <span aria-hidden="true">🏛️</span>
          <span>Comprehensive Civic Incident Intake</span>
        </h2>
        <p class="card-subtitle">
          Submit municipal service requests with granular prioritization and automated agency routing.
        </p>
      </div>

      <!-- ARIA Live feedback region for form errors & confirmations -->
      <div id="enterprise-form-feedback" class="alert-box" style="display: none;" role="alert"></div>

      <form id="enterprise-intake-form" novalidate>
        <!-- Fieldset 1: Incident Location & Service Categorization -->
        <fieldset class="form-fieldset">
          <legend class="form-legend">1. Incident Location & Agency Classification</legend>
          
          <div class="form-grid-2">
            <div class="form-group">
              <label for="service-category-select" class="form-label">
                Assigned Municipal Service <span class="required-indicator" aria-hidden="true">*</span>
                <span class="sr-only">(required field)</span>
              </label>
              <select
                id="service-category-select"
                name="serviceId"
                class="form-control"
                required
                aria-required="true"
                aria-describedby="category-select-hint category-select-error"
              >
                <option value="">-- Choose Municipal Service Department --</option>
                ${this.services.map(s => `<option value="${s.id}">${s.name} (${s.agency})</option>`).join('')}
              </select>
              <span id="category-select-hint" class="form-hint">Select the public works department responsible for remediation.</span>
              <span id="category-select-error" class="form-error" style="display: none;" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <label for="incident-borough-select" class="form-label">
                Municipal Borough <span class="required-indicator" aria-hidden="true">*</span>
                <span class="sr-only">(required field)</span>
              </label>
              <select
                id="incident-borough-select"
                name="borough"
                class="form-control"
                required
                aria-required="true"
                aria-describedby="borough-select-hint borough-select-error"
              >
                <option value="">-- Select NYC Borough --</option>
                <option value="Manhattan">Manhattan</option>
                <option value="Brooklyn">Brooklyn</option>
                <option value="Queens">Queens</option>
                <option value="Bronx">Bronx</option>
                <option value="Staten Island">Staten Island</option>
              </select>
              <span id="borough-select-hint" class="form-hint">Jurisdictional borough boundary for route mapping.</span>
              <span id="borough-select-error" class="form-error" style="display: none;" aria-live="polite"></span>
            </div>
          </div>

          <div class="form-group">
            <label for="incident-street-address" class="form-label">
              Physical Street Address or Cross Intersection <span class="required-indicator" aria-hidden="true">*</span>
              <span class="sr-only">(required field)</span>
            </label>
            <input
              type="text"
              id="incident-street-address"
              name="address"
              class="form-control"
              placeholder="e.g., 450 West 33rd St, Manhattan, NY"
              required
              aria-required="true"
              aria-describedby="street-address-hint street-address-error"
              autocomplete="street-address"
            />
            <span id="street-address-hint" class="form-hint">Include exact building numbers, curb position, or intersection corners.</span>
            <span id="street-address-error" class="form-error" style="display: none;" aria-live="polite"></span>
          </div>
        </fieldset>

        <!-- Fieldset 2: Incident Urgency Level (Radio Group) -->
        <fieldset class="form-fieldset">
          <legend class="form-legend">2. Severity & Triage Level</legend>
          <p class="fieldset-intro">Indicate the urgency level to determine SLA dispatch timeframes.</p>
          
          <div class="radio-options-grid" role="radiogroup" aria-label="Incident Severity Level">
            <label class="radio-card" for="urgency-low">
              <input type="radio" id="urgency-low" name="urgency" value="LOW" checked />
              <div class="radio-body">
                <span class="radio-title">Routine (Low)</span>
                <span class="radio-desc">Standard municipal maintenance within 72 business hours.</span>
              </div>
            </label>

            <label class="radio-card" for="urgency-medium">
              <input type="radio" id="urgency-medium" name="urgency" value="MEDIUM" />
              <div class="radio-body">
                <span class="radio-title">Elevated (Medium)</span>
                <span class="radio-desc">Requires agency inspection within 36 business hours.</span>
              </div>
            </label>

            <label class="radio-card" for="urgency-high">
              <input type="radio" id="urgency-high" name="urgency" value="HIGH" />
              <div class="radio-body">
                <span class="radio-title">Urgent (High)</span>
                <span class="radio-desc">Immediate public safety impact requiring 24-hour response.</span>
              </div>
            </label>
          </div>
        </fieldset>

        <!-- Fieldset 3: Description, Details & Character Count -->
        <fieldset class="form-fieldset">
          <legend class="form-legend">3. Narrative & Technical Details</legend>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <label for="incident-full-desc" class="form-label">
                Incident Description & Safety Hazards <span class="required-indicator" aria-hidden="true">*</span>
                <span class="sr-only">(required field)</span>
              </label>
              <!-- WCAG Character Counter Output with Live Region -->
              <output id="desc-char-count" class="char-counter" aria-live="polite">
                0 / 500 characters
              </output>
            </div>
            <textarea
              id="incident-full-desc"
              name="description"
              rows="4"
              maxlength="500"
              class="form-control"
              placeholder="Detail observations, vehicle blockages, pedestrian tripping risks, or structural concerns..."
              required
              aria-required="true"
              aria-describedby="desc-counter-hint incident-desc-error"
            ></textarea>
            <span id="desc-counter-hint" class="form-hint">Minimum 10 characters required for automated dispatcher ingestion.</span>
            <span id="incident-desc-error" class="form-error" style="display: none;" aria-live="polite"></span>
          </div>

          <!-- Notification Preferences Checkbox Group -->
          <div class="form-group">
            <span class="form-label" id="notify-group-label">Notification Channels (Select all that apply)</span>
            <div class="checkbox-group" role="group" aria-labelledby="notify-group-label">
              <label class="checkbox-item" for="notify-sms">
                <input type="checkbox" id="notify-sms" name="notifyChannels" value="SMS" />
                <span>SMS Status Updates</span>
              </label>
              <label class="checkbox-item" for="notify-email">
                <input type="checkbox" id="notify-email" name="notifyChannels" value="EMAIL" checked />
                <span>Email Audit Confirmations</span>
              </label>
            </div>
          </div>
        </fieldset>

        <!-- Form Action Bar -->
        <div class="form-action-bar">
          <button type="submit" class="btn-primary btn-large" id="btn-submit-enterprise-form">
            <span aria-hidden="true">🚀</span>
            <span>Submit Dispatch Ticket</span>
          </button>
          <button type="reset" class="btn-secondary" id="btn-reset-enterprise-form">
            Reset All Fields
          </button>
        </div>
      </form>
    `;
  }

  private bindEvents(): void {
    const textarea = this.element.querySelector('#incident-full-desc') as HTMLTextAreaElement;
    const counter = this.element.querySelector('#desc-char-count') as HTMLElement;
    const form = this.element.querySelector('#enterprise-intake-form') as HTMLFormElement;
    const categorySelect = this.element.querySelector('#service-category-select') as HTMLSelectElement;
    const boroughSelect = this.element.querySelector('#incident-borough-select') as HTMLSelectElement;
    const addressInput = this.element.querySelector('#incident-street-address') as HTMLInputElement;
    const feedbackRegion = this.element.querySelector('#enterprise-form-feedback') as HTMLElement;

    // Real-time character count updates
    textarea?.addEventListener('input', () => {
      const len = textarea.value.length;
      counter.textContent = `${len} / 500 characters`;
    });

    form?.addEventListener('submit', async (e: Event) => {
      e.preventDefault();

      let hasErrors = false;

      const clearError = (field: HTMLElement, errorId: string) => {
        field.removeAttribute('aria-invalid');
        const err = this.element.querySelector(`#${errorId}`) as HTMLElement;
        if (err) err.style.display = 'none';
      };

      const setError = (field: HTMLElement, errorId: string, msg: string) => {
        field.setAttribute('aria-invalid', 'true');
        const err = this.element.querySelector(`#${errorId}`) as HTMLElement;
        if (err) {
          err.style.display = 'flex';
          err.textContent = `⚠️ ${msg}`;
        }
        hasErrors = true;
      };

      clearError(categorySelect, 'category-select-error');
      clearError(boroughSelect, 'borough-select-error');
      clearError(addressInput, 'street-address-error');
      clearError(textarea, 'incident-desc-error');

      if (!categorySelect.value) {
        setError(categorySelect, 'category-select-error', 'Service category is required.');
      }
      if (!boroughSelect.value) {
        setError(boroughSelect, 'borough-select-error', 'Please select an NYC borough.');
      }
      if (!addressInput.value || addressInput.value.trim().length < 5) {
        setError(addressInput, 'street-address-error', 'Address must be at least 5 characters long.');
      }
      if (!textarea.value || textarea.value.trim().length < 10) {
        setError(textarea, 'incident-desc-error', 'Description must be at least 10 characters long.');
      }

      if (hasErrors) {
        feedbackRegion.className = 'alert-box alert-error';
        feedbackRegion.innerHTML = `<strong>Validation Error:</strong> Please review and correct the required fields above.`;
        feedbackRegion.style.display = 'flex';
        announceToScreenReader('Validation error. Please correct the highlighted fields.');
        return;
      }

      try {
        const result = await submitServiceRequest({
          serviceId: categorySelect.value,
          borough: boroughSelect.value,
          address: addressInput.value.trim(),
          description: textarea.value.trim()
        });

        feedbackRegion.className = 'alert-box alert-success';
        feedbackRegion.innerHTML = `
          <div>
            <strong>Service Request Ingested!</strong> Tracking ID: <span class="tracking-mono" style="font-weight: 800;">${result.trackingId}</span>.
            The ticket has been recorded in the central operations ledger.
          </div>
        `;
        feedbackRegion.style.display = 'flex';
        announceToScreenReader(`Service request created successfully with tracking ID ${result.trackingId}.`);

        form.reset();
        counter.textContent = '0 / 500 characters';

        if (this.onTicketCreatedCallback) {
          this.onTicketCreatedCallback(result.request);
        }
      } catch (err: any) {
        feedbackRegion.className = 'alert-box alert-error';
        feedbackRegion.innerHTML = `<strong>Submission Failed:</strong> ${err.message}`;
        feedbackRegion.style.display = 'flex';
        announceToScreenReader(`Submission error: ${err.message}`);
      }
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
