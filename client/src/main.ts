import { AccessibleHeader } from './components/Header.js';
import { AccessibleSearchBar } from './components/SearchBar.js';
import { ServiceRequestForm } from './components/ServiceForm.js';
import { StatusWidget } from './components/StatusWidget.js';
import { fetchServices, CivicService, announceToScreenReader } from './api/client.js';

class CivicPortalApp {
  private root: HTMLElement;
  private header: AccessibleHeader;
  private searchBar: AccessibleSearchBar;
  private serviceForm!: ServiceRequestForm;
  private statusWidget!: StatusWidget;
  private services: CivicService[] = [];

  constructor() {
    this.root = document.getElementById('app') as HTMLElement;
    this.header = new AccessibleHeader();
    this.searchBar = new AccessibleSearchBar(this.handleSearch.bind(this));
    this.statusWidget = new StatusWidget();
    this.serviceForm = new ServiceRequestForm(this.services, (trackingId) => {
      this.statusWidget.setTrackingId(trackingId);
    });

    this.init();
  }

  private async init(): Promise<void> {
    this.renderShell();
    await this.loadInitialData();
  }

  private renderShell(): void {
    // 1. Mount Accessible Header (Remediates WEB-004 & WEB-005)
    this.root.appendChild(this.header.getElement());

    // 2. Render Hero Banner with Accessible Search (Remediates WEB-002 & WEB-003)
    const hero = document.createElement('section');
    hero.className = 'hero-section';
    hero.setAttribute('aria-label', 'Portal Introduction and Search');
    hero.innerHTML = `
      <div class="hero-inner">
        <h1 class="hero-title">Report Municipal Problems & Track Service Requests</h1>
        <p class="hero-subtitle">
          An accessible, transparent gateway connecting New York City residents directly to city response agencies.
        </p>
      </div>
    `;
    hero.querySelector('.hero-inner')?.appendChild(this.searchBar.getElement());
    this.root.appendChild(hero);

    // 3. Mount Main Landmark (Remediates WEB-001 Skip Navigation Target)
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1; // Allows programmatic focus from skip link
    main.className = 'main-content';
    main.setAttribute('aria-label', 'Civic Service Dashboard');

    // Dashboard 2-column grid
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    grid.appendChild(this.serviceForm.getElement());
    grid.appendChild(this.statusWidget.getElement());
    main.appendChild(grid);

    // Services Catalog Section
    const directorySection = document.createElement('section');
    directorySection.id = 'services-directory';
    directorySection.className = 'card-surface';
    directorySection.style.marginTop = '2.5rem';
    directorySection.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">
          <span aria-hidden="true">📋</span>
          <span>Featured Municipal Service Categories</span>
        </h2>
        <p class="card-subtitle">
          Review standard turnaround service level agreements (SLAs) for primary city departments.
        </p>
      </div>
      <div id="services-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
        <p style="color: var(--color-text-muted);">Loading available services...</p>
      </div>
    `;
    main.appendChild(directorySection);

    // Accessibility Statement Section
    const a11ySection = document.createElement('section');
    a11ySection.id = 'a11y-statement';
    a11ySection.className = 'card-surface';
    a11ySection.style.marginTop = '2rem';
    a11ySection.innerHTML = `
      <div class="card-header">
        <h2 class="card-title" style="font-size: var(--font-size-xl);">
          <span aria-hidden="true">♿</span>
          <span>Digital Accessibility Conformance Statement</span>
        </h2>
        <p class="card-subtitle">
          Built to comply with W3C WCAG 2.1 & 2.2 Conformance Level AA, Section 508, and ADA Title II.
        </p>
      </div>
      <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.6;">
        <p style="margin-bottom: 0.75rem;">
          This application was re-architected following a rigorous baseline audit of legacy public service portals. Key remediations include:
        </p>
        <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
          <li><strong>Keyboard Operability:</strong> Functional skip-navigation mechanism (<a href="#main-content">Skip to content</a>) and no keyboard traps.</li>
          <li><strong>Focus Indicators:</strong> 3px high-contrast dual-ring focus appearance meeting WCAG 2.4.13.</li>
          <li><strong>Accessible Forms:</strong> Explicit &lt;label&gt; bindings, persistent input cues, and assistive announcements via <code>aria-live="polite"</code>.</li>
          <li><strong>Semantic Landmarks:</strong> Proper ARIA roles (<code>role="banner"</code>, <code>role="search"</code>, <code>role="contentinfo"</code>) and logical heading hierarchy (single <code>&lt;h1&gt;</code>).</li>
        </ul>
      </div>
    `;
    main.appendChild(a11ySection);

    this.root.appendChild(main);

    // 4. Mount Semantic Footer Landmark
    const footer = document.createElement('footer');
    footer.setAttribute('role', 'contentinfo');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-top-grid">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="brand-logo-badge" style="font-size: 1rem;">311</div>
              <span style="font-weight: 800; color: #ffffff;">NYC 311 Citizen Services</span>
            </div>
            <p style="font-size: var(--font-size-sm); line-height: 1.6;">
              The Official Website of the City of New York. Providing accessible, round-the-clock government assistance and non-emergency civic reporting for all five boroughs.
            </p>
          </div>
          <div>
            <h3 class="footer-heading">Emergency Services</h3>
            <ul class="footer-links">
              <li><a href="tel:911">Emergency: Call 911</a></li>
              <li><a href="tel:311">Phone 311 (Within NYC)</a></li>
              <li><a href="tel:2126399675">(212) NEW-YORK</a></li>
              <li><a href="tel:711">TTY: 711 Relay</a></li>
            </ul>
          </div>
          <div>
            <h3 class="footer-heading">Official Standards</h3>
            <ul class="footer-links">
              <li><a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener noreferrer">WCAG 2.2 Guidelines</a></li>
              <li><a href="https://designsystem.digital.gov/" target="_blank" rel="noopener noreferrer">US Web Design System</a></li>
              <li><a href="https://portal.311.nyc.gov/" target="_blank" rel="noopener noreferrer">Legacy NYC 311 Portal</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 City of New York. All rights reserved.</span>
          <span>RabTech Academy Full-Stack Architecture Monorepo</span>
        </div>
      </div>
    `;
    this.root.appendChild(footer);
  }

  private async loadInitialData(): Promise<void> {
    try {
      this.services = await fetchServices();
      this.serviceForm.updateServices(this.services);
      this.renderServicesGrid(this.services);
    } catch (err) {
      console.warn('Backend service offline or loading fallback services:', err);
      // Fallback seed services if backend server isn't spun up yet
      this.services = [
        {
          id: 'srv-pothole',
          name: 'Street Pothole Repair',
          category: 'Streets & Sidewalks',
          description: 'Report dangerous road potholes, cave-ins, and uneven asphalt on municipal roads.',
          averageResolutionHours: 48,
          agency: 'DOT',
          urgencyLevel: 'HIGH'
        },
        {
          id: 'srv-streetlight',
          name: 'Street Light Defect or Outage',
          category: 'Public Lighting',
          description: 'Report dark lampposts, flickering lights, or exposed municipal wiring.',
          averageResolutionHours: 72,
          agency: 'DOT',
          urgencyLevel: 'MEDIUM'
        },
        {
          id: 'srv-noise',
          name: 'Residential Noise Complaint',
          category: 'Environmental Health',
          description: 'Report excessive neighbor noise, loud music, or continuous industrial disturbance.',
          averageResolutionHours: 24,
          agency: 'DEP',
          urgencyLevel: 'MEDIUM'
        }
      ];
      this.serviceForm.updateServices(this.services);
      this.renderServicesGrid(this.services);
    }
  }

  private renderServicesGrid(services: CivicService[]): void {
    const container = document.getElementById('services-grid-container');
    if (!container) return;

    container.innerHTML = services.map(s => `
      <article
        tabindex="0"
        style="background: #ffffff; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;"
        aria-labelledby="card-title-${s.id}"
      >
        <div>
          <span style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary-600); text-transform: uppercase;">
            ${s.category}
          </span>
          <h3 id="card-title-${s.id}" style="font-size: var(--font-size-base); font-weight: 700; margin: 0.35rem 0 0.5rem; color: var(--color-primary-900);">
            ${s.name}
          </h3>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: 1.5; margin-bottom: 1rem;">
            ${s.description}
          </p>
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); border-top: 1px solid var(--color-border-subtle); padding-top: 0.5rem; display: flex; justify-content: space-between;">
          <span>Agency: <strong>${s.agency}</strong></span>
          <span>SLA: <strong>${s.averageResolutionHours} hrs</strong></span>
        </div>
      </article>
    `).join('');
  }

  private handleSearch(query: string): void {
    if (!query) {
      this.renderServicesGrid(this.services);
      announceToScreenReader('Showing all municipal service categories.');
      return;
    }

    const filtered = this.services.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase())
    );

    this.renderServicesGrid(filtered);
    announceToScreenReader(`Search complete. ${filtered.length} service categories found matching ${query}.`);
  }
}

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CivicPortalApp());
} else {
  new CivicPortalApp();
}
