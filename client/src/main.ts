import { EnterpriseSidebar } from './components/EnterpriseSidebar.js';
import { AccessibleHeader } from './components/Header.js';
import { AccessibleSearchBar } from './components/SearchBar.js';
import { AccessibleDataTable, TableRowData } from './components/DataTable.js';
import { EnterpriseForm } from './components/EnterpriseForm.js';
import { StatusWidget } from './components/StatusWidget.js';
import { AccessibleModal } from './components/AccessibleModal.js';
import { fetchServices, CivicService, announceToScreenReader } from './api/client.js';

class EnterpriseDashboardApp {
  private root: HTMLElement;
  private sidebar: EnterpriseSidebar;
  private header: AccessibleHeader;
  private searchBar: AccessibleSearchBar;
  private dataTable: AccessibleDataTable;
  private enterpriseForm: EnterpriseForm;
  private statusWidget: StatusWidget;
  private modal: AccessibleModal;
  private services: CivicService[] = [];
  private incidentRows: TableRowData[] = [
    {
      trackingId: 'NYC-2026-1001',
      category: 'Street Pothole Repair',
      address: '450 West 33rd St',
      borough: 'Manhattan',
      status: 'IN_PROGRESS',
      urgency: 'HIGH',
      submittedAt: '2026-09-21T10:15:00Z'
    },
    {
      trackingId: 'NYC-2026-2045',
      category: 'Street Light Defect',
      address: 'Grand Army Plaza',
      borough: 'Brooklyn',
      status: 'RESOLVED',
      urgency: 'MEDIUM',
      submittedAt: '2026-09-20T14:30:00Z'
    },
    {
      trackingId: 'NYC-2026-3109',
      category: 'Residential Noise Complaint',
      address: '78-14 Roosevelt Ave',
      borough: 'Queens',
      status: 'DISPATCHED',
      urgency: 'MEDIUM',
      submittedAt: '2026-09-22T08:45:00Z'
    },
    {
      trackingId: 'NYC-2026-4012',
      category: 'Inadequate Heat / Hot Water',
      address: '215 E 164th St',
      borough: 'Bronx',
      status: 'SUBMITTED',
      urgency: 'EMERGENCY',
      submittedAt: '2026-09-22T09:20:00Z'
    },
    {
      trackingId: 'NYC-2026-4822',
      category: 'Damaged Tree / Fallen Limb',
      address: 'Clove Lakes Park',
      borough: 'Staten Island',
      status: 'RECEIVED',
      urgency: 'HIGH',
      submittedAt: '2026-09-22T11:00:00Z'
    }
  ];

  constructor() {
    this.root = document.getElementById('app') as HTMLElement;
    this.root.className = 'enterprise-shell';

    this.sidebar = new EnterpriseSidebar(this.handleNavigation.bind(this));
    this.header = new AccessibleHeader();
    this.searchBar = new AccessibleSearchBar(this.handleSearch.bind(this));
    this.dataTable = new AccessibleDataTable(this.incidentRows, (row) => {
      this.statusWidget.setTrackingId(row.trackingId);
      const statusEl = document.getElementById('status-section');
      statusEl?.scrollIntoView({ behavior: 'smooth' });
    });
    this.enterpriseForm = new EnterpriseForm(this.services, (newTicket) => {
      this.incidentRows.unshift({
        trackingId: newTicket.trackingId,
        category: newTicket.serviceName || 'Civic Request',
        address: newTicket.address,
        borough: newTicket.borough,
        status: newTicket.status || 'SUBMITTED',
        urgency: 'HIGH',
        submittedAt: newTicket.createdAt || new Date().toISOString()
      });
      this.dataTable.updateData(this.incidentRows);
      this.statusWidget.setTrackingId(newTicket.trackingId);
    });
    this.statusWidget = new StatusWidget();
    this.modal = new AccessibleModal(this.handleModalDispatch.bind(this));

    this.init();
  }

  private async init(): Promise<void> {
    this.renderLayout();
    this.bindModalTrigger();
    await this.loadServices();
  }

  private renderLayout(): void {
    // 1. Mount Enterprise Sidebar (<aside>)
    this.root.appendChild(this.sidebar.getElement());

    // 2. Create Workspace Container
    const workspace = document.createElement('div');
    workspace.className = 'dashboard-workspace';

    // 3. Mount Site Header (<header role="banner">)
    workspace.appendChild(this.header.getElement());

    // 4. Hero Section with Search
    const hero = document.createElement('section');
    hero.className = 'hero-section';
    hero.setAttribute('aria-label', 'Civic Search & Portal Introduction');
    hero.innerHTML = `
      <div class="hero-inner">
        <h1 class="hero-title">New York City Operations Dashboard</h1>
        <p class="hero-subtitle">
          Enterprise civic triage portal connecting 8.3 million citizens directly to field dispatch units.
        </p>
      </div>
    `;
    hero.querySelector('.hero-inner')?.appendChild(this.searchBar.getElement());
    workspace.appendChild(hero);

    // 5. Semantic Main Landmark (<main id="main-content" tabindex="-1">)
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    main.className = 'main-content';
    main.setAttribute('aria-label', 'Enterprise Dashboard Workspace');

    // Section 1: KPI Metric Highlights (<section aria-label="Executive metric highlights">)
    const kpiSection = document.createElement('section');
    kpiSection.className = 'kpi-summary-section';
    kpiSection.setAttribute('aria-label', 'Operational KPI Metrics');
    kpiSection.style.marginBottom = '2rem';
    kpiSection.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
        <article class="card-surface" style="padding: 1.25rem; margin-bottom: 0;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary-600); text-transform: uppercase;">Active City Tickets</span>
          <div style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary-900); margin: 0.25rem 0;">1,428</div>
          <span style="font-size: 0.75rem; color: #16a34a; font-weight: 600;">↑ 94.2% within SLA</span>
        </article>

        <article class="card-surface" style="padding: 1.25rem; margin-bottom: 0;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary-600); text-transform: uppercase;">Average Resolution</span>
          <div style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary-900); margin: 0.25rem 0;">26.4 hrs</div>
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">Across all 5 boroughs</span>
        </article>

        <article class="card-surface" style="padding: 1.25rem; margin-bottom: 0;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary-600); text-transform: uppercase;">Field Crews Dispatched</span>
          <div style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary-900); margin: 0.25rem 0;">86 Teams</div>
          <span style="font-size: 0.75rem; color: #2563eb; font-weight: 600;">DOT, DSNY, DEP, HPD</span>
        </article>

        <article class="card-surface" style="padding: 1.25rem; margin-bottom: 0;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary-600); text-transform: uppercase;">A11y Conformance</span>
          <div style="font-size: 1.85rem; font-weight: 800; color: #15803d; margin: 0.25rem 0;">100%</div>
          <span style="font-size: 0.75rem; color: #15803d; font-weight: 700;">WCAG 2.2 AA Certified</span>
        </article>
      </div>
    `;
    main.appendChild(kpiSection);

    // Section 2: Accessible Data Table
    main.appendChild(this.dataTable.getElement());

    // Section 3: Two-Column Form & Status Tracker
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    grid.appendChild(this.enterpriseForm.getElement());
    grid.appendChild(this.statusWidget.getElement());
    main.appendChild(grid);

    workspace.appendChild(main);

    // 6. Semantic Footer (<footer role="contentinfo">)
    const footer = document.createElement('footer');
    footer.setAttribute('role', 'contentinfo');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-top-grid">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="brand-badge-square" style="font-size: 1rem;">311</div>
              <span style="font-weight: 800; color: #ffffff;">NYC 311 Citizen Services</span>
            </div>
            <p style="font-size: var(--font-size-sm); line-height: 1.6;">
              Official Digital Gateway of the City of New York. Providing accessible round-the-clock non-emergency civic reporting for all five boroughs.
            </p>
          </div>
          <div>
            <h3 class="footer-heading">Emergency Hotlines</h3>
            <ul class="footer-links">
              <li><a href="tel:911">Emergency: Call 911</a></li>
              <li><a href="tel:311">Phone 311 (Within NYC)</a></li>
              <li><a href="tel:2126399675">(212) NEW-YORK</a></li>
              <li><a href="tel:711">TTY: 711 Relay</a></li>
            </ul>
          </div>
          <div>
            <h3 class="footer-heading">Standards & Verification</h3>
            <ul class="footer-links">
              <li><a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener noreferrer">WCAG 2.2 Guidelines</a></li>
              <li><a href="https://designsystem.digital.gov/" target="_blank" rel="noopener noreferrer">US Web Design System</a></li>
              <li><a href="docs/accessibility-audit.md">Baseline Audit Report</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 City of New York. All rights reserved.</span>
          <span>RabTech Academy Full-Stack Architecture Monorepo</span>
        </div>
      </div>
    `;
    workspace.appendChild(footer);

    // 7. Mount Modal Dialog
    workspace.appendChild(this.modal.getElement());

    this.root.appendChild(workspace);
  }

  private bindModalTrigger(): void {
    const trigger = this.root.querySelector('#btn-open-new-ticket-modal') as HTMLElement;
    trigger?.addEventListener('click', () => {
      this.modal.open(trigger);
    });
  }

  private handleModalDispatch(formData: any): void {
    const trackingId = `NYC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    this.incidentRows.unshift({
      trackingId,
      category: 'Expedited Dispatch (' + formData.serviceType + ')',
      address: formData.address,
      borough: 'Manhattan',
      status: 'DISPATCHED',
      urgency: 'EMERGENCY',
      submittedAt: new Date().toISOString()
    });
    this.dataTable.updateData(this.incidentRows);
    this.statusWidget.setTrackingId(trackingId);
    announceToScreenReader(`Expedited ticket ${trackingId} created and dispatched.`);
  }

  private async loadServices(): Promise<void> {
    try {
      this.services = await fetchServices();
      this.enterpriseForm.updateServices(this.services);
    } catch (err) {
      console.warn('Fallback services loaded:', err);
      this.services = [
        {
          id: 'srv-pothole',
          name: 'Street Pothole Repair',
          category: 'Streets & Sidewalks',
          description: 'Report road potholes and asphalt defects.',
          averageResolutionHours: 48,
          agency: 'DOT',
          urgencyLevel: 'HIGH'
        },
        {
          id: 'srv-heat',
          name: 'Inadequate Heat or Hot Water',
          category: 'Housing Safety',
          description: 'Report residential heating violations.',
          averageResolutionHours: 12,
          agency: 'HPD',
          urgencyLevel: 'EMERGENCY'
        },
        {
          id: 'srv-trees',
          name: 'Damaged Tree or Fallen Limb',
          category: 'Parks & Recreation',
          description: 'Report fallen tree hazards.',
          averageResolutionHours: 24,
          agency: 'DPR',
          urgencyLevel: 'HIGH'
        }
      ];
      this.enterpriseForm.updateServices(this.services);
    }
  }

  private handleNavigation(sectionId: string): void {
    announceToScreenReader(`Navigated to ${sectionId.replace('nav-', '')}`);
  }

  private handleSearch(query: string): void {
    if (!query) {
      this.dataTable.updateData(this.incidentRows);
      announceToScreenReader('Showing all incident records.');
      return;
    }

    const filtered = this.incidentRows.filter(r =>
      r.trackingId.toLowerCase().includes(query.toLowerCase()) ||
      r.category.toLowerCase().includes(query.toLowerCase()) ||
      r.address.toLowerCase().includes(query.toLowerCase()) ||
      r.borough.toLowerCase().includes(query.toLowerCase())
    );

    this.dataTable.updateData(filtered);
    announceToScreenReader(`Filtered table: ${filtered.length} matching records found.`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new EnterpriseDashboardApp());
} else {
  new EnterpriseDashboardApp();
}
