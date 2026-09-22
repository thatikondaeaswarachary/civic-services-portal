import { announceToScreenReader } from '../api/client.js';
import { AuthManager, UserProfile } from '../auth.js';

export class AccessibleHeader {
  private element: HTMLElement;
  private menuToggle!: HTMLButtonElement;
  private navElement!: HTMLElement;
  private themeToggleBtn!: HTMLButtonElement;
  private authButton!: HTMLButtonElement;
  private isMenuOpen = false;
  private currentTheme: 'light' | 'dark' = 'light';
  private authManager: AuthManager;
  private onOpenAuthModalCallback?: (trigger: HTMLElement) => void;

  constructor(onOpenAuthModal?: (trigger: HTMLElement) => void) {
    this.authManager = AuthManager.getInstance();
    this.onOpenAuthModalCallback = onOpenAuthModal;

    this.element = document.createElement('header');
    this.element.setAttribute('role', 'banner');
    this.element.className = 'site-header';
    this.initThemeState();
    this.render();
    this.bindEvents();

    this.authManager.onAuthStateChanged((user) => {
      this.updateUserSessionUI(user);
    });
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
    const user = this.authManager.getCurrentUser();

    this.element.innerHTML = `
      <div class="header-top">
        <div class="official-badge">
          <span aria-hidden="true">🏛️</span>
          <span>Official Digital Civic Portal · City of New York</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <span style="font-size: var(--font-size-xs); color: #cbd5e1;" class="desktop-only">WCAG 2.2 AA Certified</span>
          
          <!-- Auth / Role Simulation Profile Trigger -->
          <button
            type="button"
            id="btn-auth-profile"
            class="btn-auth-profile"
            aria-haspopup="dialog"
            aria-label="Active user session: ${user.name}, role ${user.role}. Click to switch role or sign in."
            style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); padding: 0.25rem 0.65rem; border-radius: 9999px; color: #ffffff; cursor: pointer; font-size: 0.8rem;"
          >
            <span
              id="header-user-avatar"
              style="width: 24px; height: 24px; border-radius: 50%; background: ${user.avatarBadgeColor}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem;"
              aria-hidden="true"
            >
              ${user.initials}
            </span>
            <span id="header-user-name" style="font-weight: 700;">${user.name}</span>
            <span
              id="header-user-role-badge"
              class="status-badge ${user.role === 'DISPATCHER' ? 'status-badge-dispatched' : 'status-badge-submitted'}"
              style="font-size: 0.65rem; padding: 0.15rem 0.4rem;"
            >
              ${user.role === 'DISPATCHER' ? 'Dispatcher' : 'Resident'}
            </span>
          </button>

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
          <span class="breadcrumb-current" aria-current="page">Incident Ledger & Catalog</span>
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
              <li><a href="#service-catalog-section" class="nav-link">Service Catalog</a></li>
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
    this.authButton = this.element.querySelector('#btn-auth-profile') as HTMLButtonElement;
  }

  private updateUserSessionUI(user: UserProfile): void {
    const avatar = this.element.querySelector('#header-user-avatar');
    const name = this.element.querySelector('#header-user-name');
    const roleBadge = this.element.querySelector('#header-user-role-badge');
    const authBtn = this.element.querySelector('#btn-auth-profile') as HTMLElement;

    if (avatar) {
      avatar.textContent = user.initials;
      (avatar as HTMLElement).style.background = user.avatarBadgeColor;
    }
    if (name) name.textContent = user.name;
    if (roleBadge) {
      roleBadge.className = `status-badge ${user.role === 'DISPATCHER' ? 'status-badge-dispatched' : 'status-badge-submitted'}`;
      roleBadge.textContent = user.role === 'DISPATCHER' ? 'Dispatcher' : 'Resident';
      (roleBadge as HTMLElement).style.fontSize = '0.65rem';
      (roleBadge as HTMLElement).style.padding = '0.15rem 0.4rem';
    }
    if (authBtn) {
      authBtn.setAttribute('aria-label', `Active user session: ${user.name}, role ${user.role}. Click to switch role or sign in.`);
    }
  }

  private bindEvents(): void {
    this.menuToggle?.addEventListener('click', () => this.toggleMenu());
    this.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());

    this.authButton?.addEventListener('click', () => {
      if (this.onOpenAuthModalCallback) {
        this.onOpenAuthModalCallback(this.authButton);
      }
    });

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
