export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  shortcut?: string;
  href: string;
}

export class EnterpriseSidebar {
  private element: HTMLElement;
  private currentActiveId = 'nav-overview';
  private onNavigateCallback?: (id: string) => void;

  private navItems: NavItem[] = [
    { id: 'nav-overview', label: 'Executive Overview', icon: '📊', shortcut: 'Alt+1', href: '#overview' },
    { id: 'nav-requests', label: 'Service Requests', icon: '📋', badge: '12 New', shortcut: 'Alt+2', href: '#requests' },
    { id: 'nav-dispatch', label: 'Agency Dispatch', icon: '🚒', shortcut: 'Alt+3', href: '#dispatch' },
    { id: 'nav-analytics', label: 'SLA & Analytics', icon: '📈', shortcut: 'Alt+4', href: '#analytics' },
    { id: 'nav-settings', label: 'Compliance & Settings', icon: '⚙️', shortcut: 'Alt+5', href: '#settings' }
  ];

  constructor(onNavigate?: (id: string) => void) {
    this.onNavigateCallback = onNavigate;
    this.element = document.createElement('aside');
    this.element.className = 'dashboard-sidebar';
    this.element.setAttribute('aria-label', 'Enterprise Dashboard Navigation');
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-badge-square" aria-hidden="true">311</div>
        <div class="brand-meta">
          <span class="brand-org">City of New York</span>
          <span class="brand-sub">Enterprise Portal</span>
        </div>
      </div>

      <nav aria-label="Main Application Sections" class="sidebar-nav">
        <div class="nav-section-title" id="core-nav-heading">Platform Modules</div>
        <ul class="sidebar-nav-list" aria-labelledby="core-nav-heading">
          ${this.navItems.map(item => `
            <li class="sidebar-nav-item">
              <a
                href="${item.href}"
                id="${item.id}"
                class="sidebar-nav-link ${item.id === this.currentActiveId ? 'active' : ''}"
                ${item.id === this.currentActiveId ? 'aria-current="page"' : ''}
              >
                <span class="nav-icon" aria-hidden="true">${item.icon}</span>
                <span class="nav-text">${item.label}</span>
                ${item.badge ? `<span class="nav-badge" aria-label="${item.badge}">${item.badge}</span>` : ''}
                ${item.shortcut ? `<kbd class="nav-kbd" aria-hidden="true">${item.shortcut}</kbd>` : ''}
              </a>
            </li>
          `).join('')}
        </ul>

        <div class="nav-section-title" id="quick-actions-heading" style="margin-top: 1.5rem;">Quick Tools</div>
        <ul class="sidebar-nav-list" aria-labelledby="quick-actions-heading">
          <li class="sidebar-nav-item">
            <button
              type="button"
              id="btn-open-new-ticket-modal"
              class="sidebar-action-button"
              aria-haspopup="dialog"
            >
              <span aria-hidden="true">➕</span>
              <span>Expedited Intake</span>
            </button>
          </li>
          <li class="sidebar-nav-item">
            <a href="docs/accessibility-audit.md" class="sidebar-nav-link" target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">♿</span>
              <span>A11y Audit Report</span>
            </a>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer">
        <div class="compliance-pill">
          <span aria-hidden="true" style="color: #22c55e;">●</span>
          <span>WCAG 2.2 AA Verified</span>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.element.querySelectorAll<HTMLAnchorElement>('.sidebar-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const id = link.id;
        if (id) {
          e.preventDefault();
          this.setActiveItem(id);
          if (this.onNavigateCallback) {
            this.onNavigateCallback(id);
          }
        }
      });
    });
  }

  public setActiveItem(id: string): void {
    this.currentActiveId = id;
    this.element.querySelectorAll<HTMLAnchorElement>('.sidebar-nav-link').forEach(link => {
      if (link.id === id) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
