import { AuthManager, UserRole, UserProfile, PRESET_PERSONAS } from '../auth.js';
import { announceToScreenReader } from '../api/client.js';

export class AuthModal {
  private dialogElement: HTMLDialogElement;
  private triggerElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private authManager: AuthManager;

  constructor() {
    this.authManager = AuthManager.getInstance();
    this.dialogElement = document.createElement('dialog');
    this.dialogElement.className = 'accessible-modal-dialog';
    this.dialogElement.id = 'auth-simulation-dialog';
    this.dialogElement.setAttribute('aria-labelledby', 'auth-dialog-title');
    this.dialogElement.setAttribute('aria-describedby', 'auth-dialog-desc');
    this.render();
    this.bindEvents();
  }

  public getElement(): HTMLDialogElement {
    return this.dialogElement;
  }

  private render(): void {
    const user = this.authManager.getCurrentUser();

    this.dialogElement.innerHTML = `
      <div class="modal-dialog-content" style="max-width: 560px;">
        <div class="modal-dialog-header">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span aria-hidden="true" style="font-size: 1.35rem;">🔐</span>
            <h2 id="auth-dialog-title" class="modal-title">Authentication Simulation</h2>
          </div>
          <button
            type="button"
            class="btn-modal-close"
            id="btn-close-auth-modal"
            aria-label="Close authentication simulation dialog"
          >
            ✕
          </button>
        </div>

        <p id="auth-dialog-desc" class="modal-description">
          Toggle roles between a <strong>Verified Resident</strong> filing civic claims and a <strong>Municipal Dispatcher</strong> administrating triage tickets and field operations.
        </p>

        <!-- Current Active Session Card -->
        <div class="auth-current-card" style="background: var(--color-surface-subtle, rgba(0,0,0,0.03)); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: ${user.avatarBadgeColor}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;" aria-hidden="true">
              ${user.initials}
            </div>
            <div>
              <div style="font-weight: 700; color: var(--color-primary-900);" id="auth-user-name">${user.name}</div>
              <div style="font-size: 0.8rem; color: var(--color-text-muted);" id="auth-user-email">${user.email}</div>
            </div>
          </div>
          <div>
            <span class="status-badge ${user.role === 'DISPATCHER' ? 'status-badge-dispatched' : 'status-badge-submitted'}" id="auth-user-role-badge">
              ${user.role === 'DISPATCHER' ? 'Dispatcher Admin' : 'Verified Resident'}
            </span>
          </div>
        </div>

        <!-- 1-Click Persona Switcher -->
        <fieldset class="modal-fieldset" style="margin-bottom: 1.5rem;">
          <legend class="modal-legend">1-Click Fast Switch Personas</legend>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-top: 0.75rem;">
            <button
              type="button"
              id="btn-login-resident"
              class="btn-secondary"
              style="display: flex; flex-direction: column; align-items: flex-start; padding: 0.85rem; gap: 0.25rem; border-color: ${user.role === 'RESIDENT' ? 'var(--color-primary-600)' : 'var(--color-border)'};"
              aria-label="Switch active role to Elena Rostova, Brooklyn Resident"
            >
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                <span aria-hidden="true">👤</span> Elena Rostova
              </div>
              <span style="font-size: 0.75rem; color: var(--color-text-muted);">Resident (Brooklyn)</span>
              <span style="font-size: 0.7rem; color: var(--color-primary-600); font-weight: 600;">Files & Tracks Claims</span>
            </button>

            <button
              type="button"
              id="btn-login-dispatcher"
              class="btn-secondary"
              style="display: flex; flex-direction: column; align-items: flex-start; padding: 0.85rem; gap: 0.25rem; border-color: ${user.role === 'DISPATCHER' ? 'var(--color-primary-600)' : 'var(--color-border)'};"
              aria-label="Switch active role to Marcus Vance, DOT Dispatch Commander"
            >
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                <span aria-hidden="true">🎖️</span> Marcus Vance
              </div>
              <span style="font-size: 0.75rem; color: var(--color-text-muted);">DOT Dispatcher (Admin)</span>
              <span style="font-size: 0.7rem; color: #d97706; font-weight: 600;">Updates Status & Triage</span>
            </button>
          </div>
        </fieldset>

        <!-- Custom Login Simulation -->
        <form id="custom-auth-form" novalidate>
          <fieldset class="modal-fieldset" style="margin-bottom: 1.5rem;">
            <legend class="modal-legend">Or Sign In with Custom Profile</legend>
            
            <div class="form-group" style="margin-top: 0.5rem;">
              <label for="custom-auth-name" class="form-label">
                Full Name <span class="required-indicator" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="custom-auth-name"
                class="form-control"
                required
                aria-required="true"
                placeholder="e.g. Jordan Smith"
              />
            </div>

            <div class="form-group">
              <label for="custom-auth-email" class="form-label">
                Municipal or Citizen Email <span class="required-indicator" aria-hidden="true">*</span>
              </label>
              <input
                type="email"
                id="custom-auth-email"
                class="form-control"
                required
                aria-required="true"
                placeholder="e.g. jsmith@example.nyc"
              />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label for="custom-auth-role" class="form-label">Role</label>
                <select id="custom-auth-role" class="form-control">
                  <option value="RESIDENT">Resident (Citizen)</option>
                  <option value="DISPATCHER">Municipal Dispatcher (Admin)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="custom-auth-borough" class="form-label">Borough Jurisdiction</label>
                <select id="custom-auth-borough" class="form-control">
                  <option value="Brooklyn">Brooklyn</option>
                  <option value="Manhattan">Manhattan</option>
                  <option value="Queens">Queens</option>
                  <option value="Bronx">Bronx</option>
                  <option value="Staten Island">Staten Island</option>
                </select>
              </div>
            </div>

            <button type="submit" class="btn-primary" style="width: 100%; margin-top: 0.5rem;">
              Authenticate Custom Session
            </button>
          </fieldset>
        </form>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--color-border); padding-top: 1rem;">
          <button type="button" class="btn-secondary" id="btn-auth-logout">
            Reset to Guest Resident
          </button>
          <button type="button" class="btn-primary" id="btn-auth-done">
            Close Dialog
          </button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const closeBtn = this.dialogElement.querySelector('#btn-close-auth-modal');
    const doneBtn = this.dialogElement.querySelector('#btn-auth-done');
    const residentBtn = this.dialogElement.querySelector('#btn-login-resident');
    const dispatcherBtn = this.dialogElement.querySelector('#btn-login-dispatcher');
    const logoutBtn = this.dialogElement.querySelector('#btn-auth-logout');
    const customForm = this.dialogElement.querySelector('#custom-auth-form') as HTMLFormElement;

    closeBtn?.addEventListener('click', () => this.close());
    doneBtn?.addEventListener('click', () => this.close());

    residentBtn?.addEventListener('click', () => {
      const user = this.authManager.loginWithPersona('RESIDENT');
      announceToScreenReader(`Switched role to ${user.name} (${user.title})`);
      this.updateCardView();
    });

    dispatcherBtn?.addEventListener('click', () => {
      const user = this.authManager.loginWithPersona('DISPATCHER');
      announceToScreenReader(`Switched role to ${user.name} (${user.title})`);
      this.updateCardView();
    });

    logoutBtn?.addEventListener('click', () => {
      const user = this.authManager.logout();
      announceToScreenReader(`Logged out. Active session reset to ${user.name}`);
      this.updateCardView();
    });

    customForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = this.dialogElement.querySelector('#custom-auth-name') as HTMLInputElement;
      const emailInput = this.dialogElement.querySelector('#custom-auth-email') as HTMLInputElement;
      const roleInput = this.dialogElement.querySelector('#custom-auth-role') as HTMLSelectElement;
      const boroughInput = this.dialogElement.querySelector('#custom-auth-borough') as HTMLSelectElement;

      if (!nameInput.value.trim() || !emailInput.value.trim()) {
        announceToScreenReader('Please fill in both name and email.');
        nameInput.focus();
        return;
      }

      const role = roleInput.value as UserRole;
      const user = this.authManager.loginCustom(
        nameInput.value.trim(),
        emailInput.value.trim(),
        role,
        boroughInput.value
      );

      announceToScreenReader(`Authenticated as ${user.name} (${user.role})`);
      this.updateCardView();
      this.close();
    });

    // Native Esc key handling
    this.dialogElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    });

    // Close when clicking outside content (backdrop)
    this.dialogElement.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.dialogElement) {
        this.close();
      }
    });
  }

  private updateCardView(): void {
    const user = this.authManager.getCurrentUser();
    const nameEl = this.dialogElement.querySelector('#auth-user-name');
    const emailEl = this.dialogElement.querySelector('#auth-user-email');
    const badgeEl = this.dialogElement.querySelector('#auth-user-role-badge');
    const residentBtn = this.dialogElement.querySelector('#btn-login-resident') as HTMLElement;
    const dispatcherBtn = this.dialogElement.querySelector('#btn-login-dispatcher') as HTMLElement;

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (badgeEl) {
      badgeEl.className = `status-badge ${user.role === 'DISPATCHER' ? 'status-badge-dispatched' : 'status-badge-submitted'}`;
      badgeEl.textContent = user.role === 'DISPATCHER' ? 'Dispatcher Admin' : 'Verified Resident';
    }

    if (residentBtn) {
      residentBtn.style.borderColor = user.role === 'RESIDENT' ? 'var(--color-primary-600)' : 'var(--color-border)';
    }
    if (dispatcherBtn) {
      dispatcherBtn.style.borderColor = user.role === 'DISPATCHER' ? 'var(--color-primary-600)' : 'var(--color-border)';
    }
  }

  public open(trigger?: HTMLElement): void {
    this.triggerElement = trigger || null;
    this.updateCardView();

    if (typeof this.dialogElement.showModal === 'function') {
      this.dialogElement.showModal();
    } else {
      this.dialogElement.setAttribute('open', '');
    }

    this.cacheFocusableElements();
    const firstFocusable = this.dialogElement.querySelector('#btn-login-resident') as HTMLElement;
    firstFocusable?.focus();

    announceToScreenReader('Authentication simulation dialog opened. Press Escape to close.');
  }

  public close(): void {
    if (typeof this.dialogElement.close === 'function') {
      this.dialogElement.close();
    } else {
      this.dialogElement.removeAttribute('open');
    }

    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      this.triggerElement.focus();
    }

    announceToScreenReader('Authentication simulation dialog closed.');
  }

  private cacheFocusableElements(): void {
    const focusableSelectors = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const elements = Array.from(this.dialogElement.querySelectorAll(focusableSelectors)) as HTMLElement[];
    this.focusableElements = elements.filter(el => el.offsetParent !== null || el === this.dialogElement);
  }

  private trapFocus(e: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
}
