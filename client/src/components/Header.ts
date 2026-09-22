import { announceToScreenReader } from '../api/client.js';

export class AccessibleHeader {
  private element: HTMLElement;
  private menuToggle!: HTMLButtonElement;
  private navElement!: HTMLElement;
  private themeToggleBtn!: HTMLButtonElement;
  private isMenuOpen = false;
  private currentTheme: 'light' | 'dark' = 'light';

  constructor() {
    this.element = document.createElement('header');
    this.element.setAttribute('role', 'banner');
    this.element.className = 'site-header';
    this.initThemeState();
    this.render();
    this.bindEvents();
  }

  private initThemeState(): void {
    const saved = localStorage.getItem('civic-theme') as 'light' | 'dark' | null;
    if (saved) {
      this.currentTheme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.currentTheme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="header-top">
        <div class="official-badge">
          <span aria-hidden="true">🏛️</span>
          <span>Official Digital Civic Portal · City of New York</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span style="font-size: var(--font-size-xs); color: #cbd5e1;">WCAG 2.2 AA Certified</span>
          
          <!-- Theme Toggle Button -->
          <button
            type="button"
            id="btn-theme-switch"
            class="btn-theme-toggle"
            aria-label="Toggle between light and dark color themes"
          >
            <span aria-hidden="true" id="theme-icon">${this.currentTheme === 'dark' ? '☀️' : '🌙'}</span>
            <span id="theme-text">${this.currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>

      <div class="header-main">
        <div class="header-breadcrumbs" aria-label="Breadcrumbs">
          <span>Home</span>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <span>Civic Operations</span>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <span class="breadcrumb-current" aria-current="page">Incident Ledger</span>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem;">
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
              <li><a href="#data-table-heading" class="nav-link active">Master Ledger</a></li>
              <li><a href="#enterprise-form-title" class="nav-link">Intake Form</a></li>
              <li><a href="#status-section" class="nav-link">Status Tracker</a></li>
              <li><a href="docs/accessibility-audit.md" class="nav-link" target="_blank" rel="noopener noreferrer">Audit Report</a></li>
            </ul>
          </nav>
        </div>
      </div>
    `;

    this.menuToggle = this.element.querySelector('#menu-toggle-btn') as HTMLButtonElement;
    this.navElement = this.element.querySelector('#primary-navigation') as HTMLElement;
    this.themeToggleBtn = this.element.querySelector('#btn-theme-switch') as HTMLButtonElement;
  }

  private bindEvents(): void {
    this.menuToggle?.addEventListener('click', () => this.toggleMenu());

    this.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.isMenuOpen && e.key === 'Escape') {
        e.preventDefault();
        this.closeMenu();
      }
    });
  }

  private toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('civic-theme', this.currentTheme);

    const icon = this.element.querySelector('#theme-icon');
    const text = this.element.querySelector('#theme-text');
    if (icon) icon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
    if (text) text.textContent = this.currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';

    announceToScreenReader(`Switched to ${this.currentTheme} theme mode.`);
  }

  private toggleMenu(): void {
    this.isMenuOpen ? this.closeMenu() : this.openMenu();
  }

  private openMenu(): void {
    this.isMenuOpen = true;
    this.menuToggle.setAttribute('aria-expanded', 'true');
    this.navElement.classList.add('is-open');

    const firstLink = this.navElement.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();
  }

  private closeMenu(): void {
    this.isMenuOpen = false;
    this.menuToggle.setAttribute('aria-expanded', 'false');
    this.navElement.classList.remove('is-open');
    this.menuToggle.focus();
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
