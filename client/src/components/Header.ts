export class AccessibleHeader {
  private element: HTMLElement;
  private menuToggle!: HTMLButtonElement;
  private navElement!: HTMLElement;
  private isMenuOpen = false;

  constructor() {
    this.element = document.createElement('header');
    this.element.setAttribute('role', 'banner');
    this.element.className = 'site-header';
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="header-top">
        <div class="official-badge">
          <span aria-hidden="true">🏛️</span>
          <span>Official Digital Civic Portal · City of New York</span>
        </div>
        <div>
          <span style="font-size: var(--font-size-xs); color: #cbd5e1;">WCAG 2.2 Level AA Certified</span>
        </div>
      </div>
      <div class="header-main">
        <a href="/" class="brand-container" aria-label="NYC 311 Civic Services Homepage">
          <div class="brand-logo-badge" aria-hidden="true">311</div>
          <div class="brand-titles">
            <span class="brand-name">NYC 311 Online</span>
            <span class="brand-tagline">Citizen Services & Problem Resolution</span>
          </div>
        </a>

        <!-- Mobile Drawer Trigger (Remediates WEB-004 & WEB-005) -->
        <button
          type="button"
          class="btn-mobile-menu"
          id="menu-toggle-btn"
          aria-expanded="false"
          aria-controls="primary-navigation"
          aria-label="Toggle navigation menu"
        >
          <span aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>

        <!-- Primary Semantic Landmark Navigation -->
        <nav
          id="primary-navigation"
          class="main-nav"
          aria-label="Primary Navigation"
        >
          <ul>
            <li><a href="#report-section" class="nav-link active">Report a Problem</a></li>
            <li><a href="#status-section" class="nav-link">Check Status</a></li>
            <li><a href="#services-directory" class="nav-link">Service Directory</a></li>
            <li><a href="#a11y-statement" class="nav-link">Accessibility</a></li>
          </ul>
        </nav>
      </div>
    `;

    this.menuToggle = this.element.querySelector('#menu-toggle-btn') as HTMLButtonElement;
    this.navElement = this.element.querySelector('#primary-navigation') as HTMLElement;
  }

  private bindEvents(): void {
    this.menuToggle.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Close on Escape key press (WEB-005 remediation)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.isMenuOpen && e.key === 'Escape') {
        e.preventDefault();
        this.closeMenu();
      }
    });
  }

  private toggleMenu(): void {
    this.isMenuOpen ? this.closeMenu() : this.openMenu();
  }

  private openMenu(): void {
    this.isMenuOpen = true;
    this.menuToggle.setAttribute('aria-expanded', 'true');
    this.navElement.classList.add('is-open');

    // Focus first navigation item
    const firstLink = this.navElement.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();
  }

  private closeMenu(): void {
    this.isMenuOpen = false;
    this.menuToggle.setAttribute('aria-expanded', 'false');
    this.navElement.classList.remove('is-open');
    this.menuToggle.focus(); // Restore focus to trigger
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
