/**
 * Modular Dynamic Application Controller (app.js)
 * Implements Real-time Search Filtering, Category Tabs, Sorting,
 * LocalStorage State Caching, Loading Skeletons, and Error Banners.
 */

import { fetchCivicFeed } from './api.js';

const PREFS_KEY = 'civic_user_preferences_v1';
const BOOKMARKS_KEY = 'civic_saved_bookmarks_v1';

export class CivicAppController {
  constructor(mountContainerId = 'live-feed-section') {
    this.mountContainer = typeof document !== 'undefined' ? document.getElementById(mountContainerId) : null;
    this.allIncidents = [];
    this.filteredIncidents = [];
    this.searchQuery = '';
    this.activeCategory = 'All';
    this.sortCriteria = 'date-desc';
    this.bookmarks = new Set(this.loadBookmarks());
    this.isLoading = false;
    this.debounceTimer = null;

    this.loadUserPreferences();
  }

  /**
   * Loads saved user preferences from localStorage
   */
  loadUserPreferences() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.category) this.activeCategory = prefs.category;
        if (prefs.sort) this.sortCriteria = prefs.sort;
      }
    } catch (e) {
      console.warn('[App State] Error loading user preferences:', e);
    }
  }

  /**
   * Saves user preferences to localStorage
   */
  saveUserPreferences() {
    try {
      const prefs = {
        category: this.activeCategory,
        sort: this.sortCriteria,
        updatedAt: Date.now()
      };
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('[App State] Error saving user preferences:', e);
    }
  }

  /**
   * Loads bookmarked ticket IDs from localStorage
   */
  loadBookmarks() {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Toggles bookmark state and updates localStorage
   */
  toggleBookmark(trackingId) {
    if (this.bookmarks.has(trackingId)) {
      this.bookmarks.delete(trackingId);
      this.announce(`Removed ticket ${trackingId} from bookmarked favorites.`);
    } else {
      this.bookmarks.add(trackingId);
      this.announce(`Bookmarked ticket ${trackingId} for fast access.`);
    }

    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(this.bookmarks)));
    } catch (e) {
      console.warn('[App State] Error saving bookmarks:', e);
    }

    this.renderCards();
  }

  /**
   * Initializes component, mounts skeleton, and fetches live data
   */
  async init() {
    if (!this.mountContainer) {
      console.warn('[App] Mount container not found, creating dynamic container.');
      this.mountContainer = document.createElement('section');
      this.mountContainer.id = 'live-feed-section';
      this.mountContainer.className = 'card-surface';
      document.querySelector('main')?.appendChild(this.mountContainer);
    }

    this.renderShell();
    this.renderSkeletons(4);

    try {
      this.isLoading = true;
      const { data, fromCache, stale } = await fetchCivicFeed();
      this.allIncidents = data;
      this.isLoading = false;

      if (stale) {
        this.renderBanner('Showing cached offline data. Live dispatch server is currently unreachable.', 'warning');
      } else if (fromCache) {
        console.log('[App] Rendered from client cache.');
      }

      this.applyFiltersAndSort();
    } catch (err) {
      this.isLoading = false;
      this.renderBanner(`Failed to load incident feed: ${err.message}`, 'error');
      this.renderEmptyState('Service feeds temporarily unavailable. Please retry shortly.');
    }
  }

  /**
   * Renders UI shell with controls: Search input, Category tabs, Sort dropdown
   */
  renderShell() {
    const categories = ['All', 'Roadway & Streets', 'Public Lighting', 'Sanitation & Debris', 'Housing & Safety', 'Parks & Environment'];

    this.mountContainer.innerHTML = `
      <div class="card-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 class="card-title">
              <span aria-hidden="true">📡</span>
              <span>Live Public Service Dispatch Stream</span>
            </h2>
            <p class="card-subtitle">
              Asynchronous feed populated from public REST endpoint with client-side caching & instant filtering.
            </p>
          </div>
          <button type="button" id="btn-refresh-feed" class="btn-secondary" aria-label="Refresh live public feed">
            <span aria-hidden="true">🔄</span> Refresh Live
          </button>
        </div>
      </div>

      <!-- Dismissible Alert Banner Container -->
      <div id="app-alert-banner" class="alert-box" style="display: none;" role="alert" aria-atomic="true"></div>

      <!-- Filter Controls Toolbar -->
      <div class="feed-toolbar" style="margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
        <!-- Live Real-Time Search Field -->
        <div class="feed-search-row" style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 260px; position: relative;">
            <label for="feed-live-search" class="sr-only">Filter live incidents in real time</label>
            <input
              type="search"
              id="feed-live-search"
              class="form-control"
              placeholder="🔍 Filter incidents in real time by title, category, borough, or tracking ID..."
              aria-describedby="search-live-status"
              autocomplete="off"
            />
          </div>
          <div style="min-width: 180px;">
            <label for="feed-sort-select" class="sr-only">Sort incidents by</label>
            <select id="feed-sort-select" class="form-control">
              <option value="date-desc" ${this.sortCriteria === 'date-desc' ? 'selected' : ''}>Newest First</option>
              <option value="date-asc" ${this.sortCriteria === 'date-asc' ? 'selected' : ''}>Oldest First</option>
              <option value="urgency-desc" ${this.sortCriteria === 'urgency-desc' ? 'selected' : ''}>Priority: High to Low</option>
              <option value="title-asc" ${this.sortCriteria === 'title-asc' ? 'selected' : ''}>Title: A to Z</option>
            </select>
          </div>
        </div>

        <!-- Accessible Category Tabs -->
        <div
          role="tablist"
          aria-label="Filter incidents by municipal category"
          class="category-tabs-container"
          style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;"
        >
          ${categories.map(cat => `
            <button
              type="button"
              role="tab"
              id="tab-${cat.replace(/\s+/g, '-').toLowerCase()}"
              class="category-tab-btn ${this.activeCategory === cat ? 'active' : ''}"
              aria-selected="${this.activeCategory === cat ? 'true' : 'false'}"
              data-category="${cat}"
              tabindex="${this.activeCategory === cat ? '0' : '-1'}"
            >
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Live Match Counter for Screen Readers -->
      <div id="search-live-status" class="sr-only" aria-live="polite"></div>

      <!-- Dynamic Cards Container -->
      <div id="feed-cards-grid" class="feed-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.25rem;"></div>
    `;

    this.bindToolbarEvents();
  }

  /**
   * Binds event listeners for search, category tabs, sort, and refresh
   */
  bindToolbarEvents() {
    const searchInput = this.mountContainer.querySelector('#feed-live-search');
    const sortSelect = this.mountContainer.querySelector('#feed-sort-select');
    const tabButtons = this.mountContainer.querySelectorAll('.category-tab-btn');
    const refreshBtn = this.mountContainer.querySelector('#btn-refresh-feed');

    // Debounced real-time search filtering (300ms)
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.applyFiltersAndSort();
      }, 250);
    });

    // Dynamic sort dropdown
    sortSelect?.addEventListener('change', (e) => {
      this.sortCriteria = e.target.value;
      this.saveUserPreferences();
      this.applyFiltersAndSort();
    });

    // Category tabs interaction
    tabButtons.forEach(tab => {
      tab.addEventListener('click', () => {
        tabButtons.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');

        this.activeCategory = tab.getAttribute('data-category') || 'All';
        this.saveUserPreferences();
        this.applyFiltersAndSort();
        this.announce(`Category switched to ${this.activeCategory}`);
      });
    });

    // Manual refresh button (forces live API query bypassing cache)
    refreshBtn?.addEventListener('click', async () => {
      this.renderSkeletons(4);
      try {
        const { data } = await fetchCivicFeed(true);
        this.allIncidents = data;
        this.applyFiltersAndSort();
        this.renderBanner('Live data successfully synchronized from public REST endpoint.', 'success');
        this.announce('Live public data refreshed.');
      } catch (err) {
        this.renderBanner(`Refresh failed: ${err.message}`, 'error');
      }
    });
  }

  /**
   * Applies client-side search filtering, category tab, and sorting
   */
  applyFiltersAndSort() {
    let result = [...this.allIncidents];

    // 1. Category tab filter
    if (this.activeCategory !== 'All') {
      result = result.filter(item => item.category === this.activeCategory);
    }

    // 2. Real-time search query
    if (this.searchQuery) {
      result = result.filter(item =>
        (item.title || '').toLowerCase().includes(this.searchQuery) ||
        (item.description || '').toLowerCase().includes(this.searchQuery) ||
        (item.trackingId || '').toLowerCase().includes(this.searchQuery) ||
        (item.borough || '').toLowerCase().includes(this.searchQuery)
      );
    }

    // 3. Multi-field sorting logic
    result.sort((a, b) => {
      if (this.sortCriteria === 'date-desc') {
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      }
      if (this.sortCriteria === 'date-asc') {
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      }
      if (this.sortCriteria === 'urgency-desc') {
        const ranks = { EMERGENCY: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (ranks[b.urgency] || 0) - (ranks[a.urgency] || 0);
      }
      if (this.sortCriteria === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    this.filteredIncidents = result;
    this.renderCards();

    // Update screen reader live status
    const statusEl = this.mountContainer ? this.mountContainer.querySelector('#search-live-status') : null;
    if (statusEl) {
      statusEl.textContent = `Showing ${result.length} incident records.`;
    }
  }

  /**
   * Renders incident cards with bookmarks & urgency badges
   */
  renderCards() {
    if (!this.mountContainer) return;
    const grid = this.mountContainer.querySelector('#feed-cards-grid');
    if (!grid) return;

    if (this.filteredIncidents.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--color-bg-surface); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md);">
          <span style="font-size: 2rem;" aria-hidden="true">🔎</span>
          <h3 style="font-size: 1.1rem; margin: 0.5rem 0; font-weight: 700;">No Matching Incidents</h3>
          <p style="font-size: 0.875rem; color: var(--color-text-muted);">
            No records matched your search query "${this.searchQuery}" in category "${this.activeCategory}".
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredIncidents.map(item => {
      const isBookmarked = this.bookmarks.has(item.trackingId);
      const timeFormatted = new Date(item.submittedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <article
          class="card-surface feed-card"
          style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; position: relative; margin-bottom: 0;"
          tabindex="0"
          aria-labelledby="card-heading-${item.id}"
        >
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <span class="tracking-mono" style="font-size: 0.75rem; font-weight: 800; color: var(--color-primary-600);">
                ${item.trackingId}
              </span>
              <button
                type="button"
                class="btn-bookmark"
                data-ticket="${item.trackingId}"
                aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark this ticket'} ${item.trackingId}"
                style="background: transparent; border: none; font-size: 1.1rem; cursor: pointer; padding: 0.2rem;"
              >
                ${isBookmarked ? '⭐' : '☆'}
              </button>
            </div>

            <h3 id="card-heading-${item.id}" style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; line-height: 1.35;">
              ${item.title}
            </h3>

            <p style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.45; margin-bottom: 1rem;">
              ${item.description}
            </p>
          </div>

          <div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
              <span class="urgency-pill urgency-${item.urgency}">${item.urgency}</span>
              <span class="status-badge status-${item.status}">${item.status.replace('_', ' ')}</span>
            </div>

            <div style="font-size: 0.75rem; color: var(--color-text-muted); border-top: 1px solid var(--color-border-subtle); padding-top: 0.5rem; display: flex; justify-content: space-between;">
              <span>${item.borough} · ${item.agency}</span>
              <time datetime="${item.submittedAt}">${timeFormatted}</time>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Bind bookmark toggle buttons
    grid.querySelectorAll('.btn-bookmark').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ticketId = btn.getAttribute('data-ticket');
        if (ticketId) this.toggleBookmark(ticketId);
      });
    });
  }

  /**
   * Renders animated shimmer loading skeletons
   */
  renderSkeletons(count = 4) {
    const grid = this.mountContainer.querySelector('#feed-cards-grid');
    if (!grid) return;

    grid.innerHTML = Array(count).fill(0).map(() => `
      <div class="skeleton-card" aria-hidden="true" style="padding: 1.25rem; background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg);">
        <div class="skeleton-line" style="width: 30%; height: 14px; margin-bottom: 0.75rem;"></div>
        <div class="skeleton-line" style="width: 80%; height: 20px; margin-bottom: 0.5rem;"></div>
        <div class="skeleton-line" style="width: 95%; height: 14px; margin-bottom: 0.35rem;"></div>
        <div class="skeleton-line" style="width: 60%; height: 14px; margin-bottom: 1.25rem;"></div>
        <div style="display: flex; gap: 0.5rem;">
          <div class="skeleton-line" style="width: 45px; height: 20px; border-radius: 9999px;"></div>
          <div class="skeleton-line" style="width: 70px; height: 20px; border-radius: 9999px;"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Renders a user-friendly dismissible error or notification banner
   */
  renderBanner(message, type = 'error') {
    const banner = this.mountContainer.querySelector('#app-alert-banner');
    if (!banner) return;

    banner.className = `alert-box alert-${type}`;
    banner.style.display = 'flex';
    banner.innerHTML = `
      <div style="flex: 1;">
        <strong>${type === 'error' ? 'Notice:' : 'Update:'}</strong> ${message}
      </div>
      <button
        type="button"
        class="btn-banner-close"
        aria-label="Dismiss this notification banner"
        style="background: transparent; border: none; font-size: 1rem; cursor: pointer; color: inherit; padding: 0 0.25rem;"
      >
        ✕
      </button>
    `;

    banner.querySelector('.btn-banner-close')?.addEventListener('click', () => {
      banner.style.display = 'none';
    });
  }

  renderEmptyState(message) {
    const grid = this.mountContainer.querySelector('#feed-cards-grid');
    if (grid) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--color-text-muted);">${message}</div>`;
    }
  }

  announce(msg) {
    if (typeof document === 'undefined') return;
    const announcer = document.getElementById('global-announcer');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => { announcer.textContent = msg; }, 50);
    }
  }
}
