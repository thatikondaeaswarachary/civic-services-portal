import { CivicService, announceToScreenReader } from '../api/client.js';

export class CatalogView {
  private element: HTMLElement;
  private services: CivicService[] = [];
  private currentCategory = 'ALL';
  private searchQuery = '';
  private onSelectServiceCallback?: (service: CivicService) => void;

  constructor(services: CivicService[], onSelectService?: (service: CivicService) => void) {
    this.services = services;
    this.onSelectServiceCallback = onSelectService;

    this.element = document.createElement('section');
    this.element.className = 'card-surface catalog-section';
    this.element.id = 'service-catalog-section';
    this.element.setAttribute('aria-labelledby', 'catalog-heading');

    this.render();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public updateServices(services: CivicService[]): void {
    this.services = services;
    this.render();
  }

  private getFilteredServices(): CivicService[] {
    return this.services.filter(s => {
      const matchesCategory =
        this.currentCategory === 'ALL' ||
        s.category.toLowerCase().includes(this.currentCategory.toLowerCase()) ||
        (this.currentCategory === 'STREETS' && (s.category.includes('Street') || s.agency === 'DOT')) ||
        (this.currentCategory === 'HOUSING' && (s.category.includes('Housing') || s.agency === 'HPD')) ||
        (this.currentCategory === 'SANITATION' && (s.category.includes('Sanitation') || s.agency === 'DSNY')) ||
        (this.currentCategory === 'PARKS' && (s.category.includes('Park') || s.agency === 'DPR'));

      const matchesSearch =
        !this.searchQuery ||
        s.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.agency.toLowerCase().includes(this.searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }

  private render(): void {
    const filtered = this.getFilteredServices();

    this.element.innerHTML = `
      <div class="table-header-bar" style="margin-bottom: 1.25rem;">
        <div>
          <h2 id="catalog-heading" class="card-title">
            <span aria-hidden="true">🏛️</span>
            <span>Interactive Civic Service Catalog</span>
          </h2>
          <p class="card-subtitle">
            Browse official City of New York municipal services, SLAs, and direct submission gateways.
          </p>
        </div>
        <div class="table-actions">
          <span class="table-total-count" aria-live="polite">
            Found <strong>${filtered.length}</strong> available municipal services
          </span>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="catalog-filters-bar" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem;">
        <button
          type="button"
          class="btn-category-tab ${this.currentCategory === 'ALL' ? 'active' : ''}"
          data-category="ALL"
        >
          All Municipal Services
        </button>
        <button
          type="button"
          class="btn-category-tab ${this.currentCategory === 'STREETS' ? 'active' : ''}"
          data-category="STREETS"
        >
          🛣️ Streets & Sidewalks (DOT)
        </button>
        <button
          type="button"
          class="btn-category-tab ${this.currentCategory === 'HOUSING' ? 'active' : ''}"
          data-category="HOUSING"
        >
          🏢 Housing & Heat (HPD)
        </button>
        <button
          type="button"
          class="btn-category-tab ${this.currentCategory === 'SANITATION' ? 'active' : ''}"
          data-category="SANITATION"
        >
          ♻️ Sanitation & Waste (DSNY)
        </button>
        <button
          type="button"
          class="btn-category-tab ${this.currentCategory === 'PARKS' ? 'active' : ''}"
          data-category="PARKS"
        >
          🌳 Parks & Forestry (DPR)
        </button>
      </div>

      <!-- Quick Search Bar -->
      <div style="margin-bottom: 1.5rem;">
        <label for="catalog-search-input" class="sr-only">Search Municipal Services Catalog</label>
        <div style="position: relative;">
          <input
            type="search"
            id="catalog-search-input"
            class="form-control"
            placeholder="Search service name, description, or agency (e.g. 'Pothole', 'Heat', 'DOT')..."
            value="${this.searchQuery}"
            style="padding-left: 2.5rem;"
          />
          <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); pointer-events: none;" aria-hidden="true">
            🔍
          </span>
        </div>
      </div>

      <!-- Service Cards Grid -->
      <div
        class="service-cards-grid"
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;"
        role="region"
        aria-label="Filtered municipal service cards"
      >
        ${filtered.length === 0 ? `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--color-surface-subtle); border-radius: var(--radius-md);">
            <p style="color: var(--color-text-muted); font-size: 1rem; margin-bottom: 1rem;">
              No municipal services match your query "<strong>${this.searchQuery}</strong>".
            </p>
            <button type="button" class="btn-secondary" id="btn-reset-catalog-filter">
              Reset Filters
            </button>
          </div>
        ` : filtered.map(srv => `
          <article
            class="card-surface service-item-card"
            style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem; margin-bottom: 0; border: 1px solid var(--color-border); transition: transform 0.2s ease, box-shadow 0.2s ease;"
          >
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span class="borough-tag" style="font-weight: 800; background: var(--color-primary-100); color: var(--color-primary-900);">
                  ${srv.agency}
                </span>
                <span class="status-badge status-${srv.urgencyLevel === 'EMERGENCY' ? 'SUBMITTED' : 'IN_PROGRESS'}">
                  SLA: ${srv.averageResolutionHours}h
                </span>
              </div>

              <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary-900); margin-bottom: 0.5rem;">
                ${srv.name}
              </h3>

              <div style="font-size: 0.75rem; color: var(--color-primary-600); font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
                ${srv.category}
              </div>

              <p style="font-size: 0.85rem; color: var(--color-text-main); line-height: 1.5; margin-bottom: 1rem;">
                ${srv.description}
              </p>
            </div>

            <div style="border-top: 1px solid var(--color-border); padding-top: 0.75rem; margin-top: auto;">
              <button
                type="button"
                class="btn-primary btn-select-catalog-service"
                data-service-id="${srv.id}"
                style="width: 100%; font-size: 0.85rem;"
                aria-label="Request and file ticket for ${srv.name}"
              >
                Request This Service ➔
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Category tabs
    this.element.querySelectorAll<HTMLButtonElement>('.btn-category-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        if (cat) {
          this.currentCategory = cat;
          this.render();
          announceToScreenReader(`Filtered catalog to ${cat} category.`);
        }
      });
    });

    // Search input
    const searchInput = this.element.querySelector('#catalog-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      // re-render grid without losing focus if possible or debounced
      this.render();
      const updatedInput = this.element.querySelector('#catalog-search-input') as HTMLInputElement;
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
      }
    });

    // Reset button
    const resetBtn = this.element.querySelector('#btn-reset-catalog-filter');
    resetBtn?.addEventListener('click', () => {
      this.currentCategory = 'ALL';
      this.searchQuery = '';
      this.render();
      announceToScreenReader('Catalog filters reset.');
    });

    // Request service buttons
    this.element.querySelectorAll<HTMLButtonElement>('.btn-select-catalog-service').forEach(btn => {
      btn.addEventListener('click', () => {
        const srvId = btn.getAttribute('data-service-id');
        const srv = this.services.find(s => s.id === srvId);
        if (srv && this.onSelectServiceCallback) {
          this.onSelectServiceCallback(srv);
        }
      });
    });
  }
}
