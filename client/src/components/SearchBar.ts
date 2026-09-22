export class AccessibleSearchBar {
  private element: HTMLElement;
  private onSearchCallback?: (query: string) => void;

  constructor(onSearch?: (query: string) => void) {
    this.onSearchCallback = onSearch;
    this.element = document.createElement('div');
    this.element.className = 'search-form-container';
    this.render();
    this.bindEvents();
  }

  private render(): void {
    // WEB-002 Remediation: Explicit <label for="..."> binding
    // WEB-003 Remediation: Non-empty <button> with text & aria-label
    this.element.innerHTML = `
      <form role="search" id="civic-search-form" class="search-field-wrapper" novalidate>
        <label for="service-search-input" class="search-label-text" id="search-input-label">
          Search City Services, Report Categories & Resources
        </label>
        
        <div class="search-input-group">
          <input
            type="search"
            id="service-search-input"
            name="civicQuery"
            class="search-input"
            placeholder="e.g., Pothole, Street Light, Heating, Tree Pruning"
            aria-labelledby="search-input-label"
            aria-describedby="search-help-text"
            autocomplete="off"
          />
          <button
            type="submit"
            class="btn-search-submit"
            id="btn-search-action"
            aria-label="Submit search query for civic services"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="btn-text">Search</span>
          </button>
        </div>
        
        <span id="search-help-text" class="sr-only">
          Enter a civic keyword or service description to filter available assistance programs.
        </span>
      </form>
    `;
  }

  private bindEvents(): void {
    const form = this.element.querySelector('#civic-search-form') as HTMLFormElement;
    const input = this.element.querySelector('#service-search-input') as HTMLInputElement;

    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const query = input.value.trim();
      if (this.onSearchCallback) {
        this.onSearchCallback(query);
      }
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
