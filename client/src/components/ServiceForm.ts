import { CivicService, submitServiceRequest, announceToScreenReader } from '../api/client.js';

export class ServiceRequestForm {
  private element: HTMLElement;
  private services: CivicService[] = [];
  private onRequestCreatedCallback?: (trackingId: string) => void;

  constructor(services: CivicService[], onRequestCreated?: (trackingId: string) => void) {
    this.services = services;
    this.onRequestCreatedCallback = onRequestCreated;
    this.element = document.createElement('div');
    this.element.className = 'card-surface';
    this.element.id = 'report-section';
    this.render();
    this.bindEvents();
  }

  public updateServices(services: CivicService[]): void {
    this.services = services;
    const select = this.element.querySelector('#service-category') as HTMLSelectElement;
    if (select) {
      select.innerHTML = `
        <option value="">-- Choose a Service Category --</option>
        ${services.map(s => `<option value="${s.id}">${s.name} (${s.agency})</option>`).join('')}
      `;
    }
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">
          <span aria-hidden="true">📝</span>
          <span>Submit a Civic Service Request</span>
        </h2>
        <p class="card-subtitle">
          Submit municipal issues directly to New York City service dispatchers. All reports receive an auditable tracking number.
        </p>
      </div>

      <!-- ARIA Assertive Live Region for Form Submission Feedback -->
      <div id="form-feedback-region" class="alert-box" style="display: none;" role="alert"></div>

      <form id="service-request-form" novalidate>
        <!-- Category Selection -->
        <div class="form-group">
          <label for="service-category" class="form-label">
            Service Category <span class="required-indicator" aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          </label>
          <select
            id="service-category"
            name="serviceId"
            class="form-control"
            required
            aria-describedby="category-hint category-error"
          >
            <option value="">-- Choose a Service Category --</option>
            ${this.services.map(s => `<option value="${s.id}">${s.name} (${s.agency})</option>`).join('')}
          </select>
          <span id="category-hint" class="form-hint">Select the municipal service or agency responsible for this issue.</span>
          <span id="category-error" class="form-error" style="display: none;" aria-live="polite"></span>
        </div>

        <!-- Incident Location / Street Address -->
        <div class="form-group">
          <label for="incident-address" class="form-label">
            Incident Street Address or Intersection <span class="required-indicator" aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          </label>
          <input
            type="text"
            id="incident-address"
            name="address"
            class="form-control"
            placeholder="e.g., 450 West 33rd Street"
            required
            aria-describedby="address-hint address-error"
            autocomplete="street-address"
          />
          <span id="address-hint" class="form-hint">Provide specific house numbers or cross streets to assist field inspectors.</span>
          <span id="address-error" class="form-error" style="display: none;" aria-live="polite"></span>
        </div>

        <!-- Borough Selection -->
        <div class="form-group">
          <label for="incident-borough" class="form-label">
            Borough <span class="required-indicator" aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          </label>
          <select
            id="incident-borough"
            name="borough"
            class="form-control"
            required
            aria-describedby="borough-hint borough-error"
          >
            <option value="">-- Select Borough --</option>
            <option value="Manhattan">Manhattan</option>
            <option value="Brooklyn">Brooklyn</option>
            <option value="Queens">Queens</option>
            <option value="Bronx">Bronx</option>
            <option value="Staten Island">Staten Island</option>
          </select>
          <span id="borough-hint" class="form-hint">The municipal borough where the incident is physically located.</span>
          <span id="borough-error" class="form-error" style="display: none;" aria-live="polite"></span>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="incident-description" class="form-label">
            Detailed Problem Description <span class="required-indicator" aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          </label>
          <textarea
            id="incident-description"
            name="description"
            rows="4"
            class="form-control"
            placeholder="Describe the condition, exact location, safety hazards, and any vehicles or property involved..."
            required
            aria-describedby="desc-hint desc-error"
          ></textarea>
          <span id="desc-hint" class="form-hint">Provide at least 10 characters detailing the nature and urgency of the condition.</span>
          <span id="desc-error" class="form-error" style="display: none;" aria-live="polite"></span>
        </div>

        <!-- Optional Contact Email -->
        <div class="form-group">
          <label for="contact-email" class="form-label">
            Notification Email Address <span style="font-weight: normal; color: var(--color-text-muted);">(Optional)</span>
          </label>
          <input
            type="email"
            id="contact-email"
            name="contactEmail"
            class="form-control"
            placeholder="citizen@example.com"
            aria-describedby="email-hint"
            autocomplete="email"
          />
          <span id="email-hint" class="form-hint">Receive automatic email alerts when the agency updates your ticket status.</span>
        </div>

        <!-- Action Button Group -->
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 2rem;">
          <button type="submit" class="btn-primary" id="btn-submit-request">
            <span class="btn-label">Submit Service Request</span>
          </button>
          <button type="reset" class="btn-secondary" id="btn-reset-form">
            Clear Form
          </button>
        </div>
      </form>
    `;
  }

  private bindEvents(): void {
    const form = this.element.querySelector('#service-request-form') as HTMLFormElement;
    const categorySelect = this.element.querySelector('#service-category') as HTMLSelectElement;
    const addressInput = this.element.querySelector('#incident-address') as HTMLInputElement;
    const boroughSelect = this.element.querySelector('#incident-borough') as HTMLSelectElement;
    const descInput = this.element.querySelector('#incident-description') as HTMLTextAreaElement;
    const emailInput = this.element.querySelector('#contact-email') as HTMLInputElement;
    const submitBtn = this.element.querySelector('#btn-submit-request') as HTMLButtonElement;
    const feedbackRegion = this.element.querySelector('#form-feedback-region') as HTMLElement;

    const clearError = (field: HTMLElement, errorElId: string) => {
      field.removeAttribute('aria-invalid');
      const err = this.element.querySelector(`#${errorElId}`) as HTMLElement;
      if (err) {
        err.style.display = 'none';
        err.textContent = '';
      }
    };

    const setError = (field: HTMLElement, errorElId: string, message: string) => {
      field.setAttribute('aria-invalid', 'true');
      const err = this.element.querySelector(`#${errorElId}`) as HTMLElement;
      if (err) {
        err.style.display = 'flex';
        err.textContent = `⚠️ ${message}`;
      }
    };

    [categorySelect, addressInput, boroughSelect, descInput].forEach(el => {
      el.addEventListener('input', () => {
        clearError(el, `${el.id.replace('incident-', '').replace('service-', '')}-error`);
      });
    });

    form.addEventListener('submit', async (e: Event) => {
      e.preventDefault();

      let hasErrors = false;

      if (!categorySelect.value) {
        setError(categorySelect, 'category-error', 'Please select a service category.');
        hasErrors = true;
      }

      if (!addressInput.value || addressInput.value.trim().length < 5) {
        setError(addressInput, 'address-error', 'Address must be at least 5 characters.');
        hasErrors = true;
      }

      if (!boroughSelect.value) {
        setError(boroughSelect, 'borough-error', 'Please select a borough.');
        hasErrors = true;
      }

      if (!descInput.value || descInput.value.trim().length < 10) {
        setError(descInput, 'desc-error', 'Description must be at least 10 characters.');
        hasErrors = true;
      }

      if (hasErrors) {
        feedbackRegion.className = 'alert-box alert-error';
        feedbackRegion.innerHTML = `
          <strong>Validation Incomplete:</strong> Please correct the highlighted errors above before submitting.
        `;
        feedbackRegion.style.display = 'flex';
        announceToScreenReader('Validation error. Please correct the highlighted fields in the service request form.');
        return;
      }

      // Submit payload to server
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Request...';

      try {
        const result = await submitServiceRequest({
          serviceId: categorySelect.value,
          address: addressInput.value.trim(),
          borough: boroughSelect.value,
          description: descInput.value.trim(),
          contactEmail: emailInput.value.trim() || undefined
        });

        // Show accessible success
        feedbackRegion.className = 'alert-box alert-success';
        feedbackRegion.innerHTML = `
          <div>
            <strong>Service Request Created Successfully!</strong><br />
            Your official tracking number is: <span style="font-weight: 800; font-size: 1.1em; color: var(--color-primary-800);">${result.trackingId}</span>.
            Use this code in the status tracker to monitor real-time agency dispatch.
          </div>
        `;
        feedbackRegion.style.display = 'flex';

        announceToScreenReader(
          `Service request created successfully. Your tracking number is ${result.trackingId}.`
        );

        form.reset();

        if (this.onRequestCreatedCallback) {
          this.onRequestCreatedCallback(result.trackingId);
        }
      } catch (err: any) {
        feedbackRegion.className = 'alert-box alert-error';
        feedbackRegion.innerHTML = `
          <strong>Submission Error:</strong> ${err.message || 'Unable to connect to municipal dispatch server.'}
        `;
        feedbackRegion.style.display = 'flex';
        announceToScreenReader(`Submission error: ${err.message}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Service Request';
      }
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
