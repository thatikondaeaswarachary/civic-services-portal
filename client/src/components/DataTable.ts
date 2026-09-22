import { AuthManager } from '../auth.js';
import { announceToScreenReader } from '../api/client.js';

export interface TableRowData {
  trackingId: string;
  category: string;
  address: string;
  borough: string;
  status: 'SUBMITTED' | 'RECEIVED' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  submittedAt: string;
  authorEmail?: string;
}

export class AccessibleDataTable {
  private element: HTMLElement;
  private data: TableRowData[] = [];
  private sortField: keyof TableRowData = 'submittedAt';
  private sortAsc = false;
  private currentPage = 1;
  private pageSize = 5;
  private filterOnlyMine = false;
  private onRowSelectCallback?: (row: TableRowData) => void;
  private onDeleteCallback?: (trackingId: string) => void;
  private authManager: AuthManager;

  constructor(
    initialData: TableRowData[],
    onRowSelect?: (row: TableRowData) => void,
    onDelete?: (trackingId: string) => void
  ) {
    this.data = initialData;
    this.onRowSelectCallback = onRowSelect;
    this.onDeleteCallback = onDelete;
    this.authManager = AuthManager.getInstance();

    this.element = document.createElement('section');
    this.element.className = 'card-surface data-table-section';
    this.element.setAttribute('aria-labelledby', 'data-table-heading');
    this.render();

    this.authManager.onAuthStateChanged(() => {
      this.render();
    });
  }

  public updateData(newData: TableRowData[]): void {
    this.data = newData;
    this.render();
  }

  private getFilteredData(): TableRowData[] {
    if (!this.filterOnlyMine) return this.data;
    const currentUser = this.authManager.getCurrentUser();
    return this.data.filter(r =>
      !r.authorEmail || r.authorEmail === currentUser.email || currentUser.role === 'DISPATCHER'
    );
  }

  private getSortedData(): TableRowData[] {
    const filtered = this.getFilteredData();
    return [...filtered].sort((a, b) => {
      const valA = a[this.sortField] || '';
      const valB = b[this.sortField] || '';
      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  private handleSort(field: keyof TableRowData): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.render();
    announceToScreenReader(`Sorted table by ${field} ${this.sortAsc ? 'ascending' : 'descending'}.`);
  }

  private render(): void {
    const sorted = this.getSortedData();
    const totalPages = Math.ceil(sorted.length / this.pageSize) || 1;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageRows = sorted.slice(startIndex, startIndex + this.pageSize);
    const isDispatcher = this.authManager.isDispatcher();
    const currentUser = this.authManager.getCurrentUser();

    const getSortAria = (field: keyof TableRowData): 'ascending' | 'descending' | 'none' => {
      if (this.sortField !== field) return 'none';
      return this.sortAsc ? 'ascending' : 'descending';
    };

    const getSortIndicator = (field: keyof TableRowData): string => {
      if (this.sortField !== field) return '↕';
      return this.sortAsc ? '↑' : '↓';
    };

    this.element.innerHTML = `
      <div class="table-header-bar">
        <div>
          <h2 id="data-table-heading" class="card-title">
            <span aria-hidden="true">🗂️</span>
            <span>Civic Incident Master Ledger</span>
          </h2>
          <p class="card-subtitle">
            Live enterprise feed of reported incidents across New York City.
          </p>
        </div>
        <div class="table-actions" style="display: flex; align-items: center; gap: 0.75rem;">
          <!-- Filter toggle for Resident vs All -->
          <button
            type="button"
            class="btn-secondary"
            id="btn-toggle-mine-filter"
            style="font-size: 0.75rem; padding: 0.35rem 0.65rem;"
            aria-pressed="${this.filterOnlyMine}"
          >
            ${this.filterOnlyMine ? 'Showing: My Requests' : 'Filter: All City Requests'}
          </button>

          <span class="table-total-count" aria-live="polite">
            Showing <strong>${pageRows.length}</strong> of <strong>${sorted.length}</strong> records
          </span>
        </div>
      </div>

      <!-- WCAG 2.1 Keyboard Accessible Scrollable Table Region (tabindex="0") -->
      <div
        class="table-responsive-wrapper"
        role="region"
        aria-label="Civic incident records table, scrollable horizontally"
        tabindex="0"
      >
        <table class="accessible-data-table">
          <caption class="sr-only">
            Active civic incident records with status, urgency level, municipal borough, and submission timestamp.
          </caption>
          
          <colgroup>
            <col style="width: 16%;" />
            <col style="width: 24%;" />
            <col style="width: 22%;" />
            <col style="width: 14%;" />
            <col style="width: 10%;" />
            <col style="width: 14%;" />
          </colgroup>

          <thead>
            <tr>
              <th scope="col" aria-sort="${getSortAria('trackingId')}">
                <button type="button" class="btn-sort" data-sort="trackingId">
                  <span>Tracking ID</span>
                  <span class="sort-icon" aria-hidden="true">${getSortIndicator('trackingId')}</span>
                </button>
              </th>
              <th scope="col" aria-sort="${getSortAria('category')}">
                <button type="button" class="btn-sort" data-sort="category">
                  <span>Service Category</span>
                  <span class="sort-icon" aria-hidden="true">${getSortIndicator('category')}</span>
                </button>
              </th>
              <th scope="col">Location & Borough</th>
              <th scope="col" aria-sort="${getSortAria('status')}">
                <button type="button" class="btn-sort" data-sort="status">
                  <span>Current Status</span>
                  <span class="sort-icon" aria-hidden="true">${getSortIndicator('status')}</span>
                </button>
              </th>
              <th scope="col" aria-sort="${getSortAria('urgency')}">
                <button type="button" class="btn-sort" data-sort="urgency">
                  <span>Priority</span>
                  <span class="sort-icon" aria-hidden="true">${getSortIndicator('urgency')}</span>
                </button>
              </th>
              <th scope="col">
                <span class="sr-only">Actions</span>
                <span aria-hidden="true">Action</span>
              </th>
            </tr>
          </thead>

          <tbody>
            ${pageRows.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">
                  <div style="font-size: 1.5rem; margin-bottom: 0.5rem;" aria-hidden="true">📋</div>
                  <div>No incident records match the current criteria.</div>
                  <button type="button" class="btn-secondary" id="btn-reset-table-filter" style="margin-top: 0.75rem; font-size: 0.8rem;">
                    Clear Filter
                  </button>
                </td>
              </tr>
            ` : pageRows.map(row => `
              <tr>
                <!-- WCAG Scope="row" links cell data to primary entity -->
                <th scope="row" class="row-identifier">
                  <span class="tracking-mono">${row.trackingId}</span>
                </th>
                <td>
                  <strong>${row.category}</strong>
                </td>
                <td>
                  <div>${row.address}</div>
                  <span class="borough-tag">${row.borough}</span>
                </td>
                <td>
                  <span class="status-badge status-${row.status}">
                    ${row.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span class="urgency-pill urgency-${row.urgency}">
                    ${row.urgency}
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <button
                      type="button"
                      class="btn-row-action"
                      data-ticket="${row.trackingId}"
                      aria-label="Inspect details for incident ticket ${row.trackingId}"
                      style="font-size: 0.75rem; padding: 0.35rem 0.6rem;"
                    >
                      ${isDispatcher ? 'Triage' : 'Inspect'}
                    </button>
                    ${isDispatcher ? `
                      <button
                        type="button"
                        class="btn-row-delete"
                        data-ticket="${row.trackingId}"
                        aria-label="Archive and delete incident ticket ${row.trackingId}"
                        style="background: transparent; border: 1px solid var(--color-border); color: #ef4444; border-radius: var(--radius-sm); padding: 0.35rem 0.45rem; cursor: pointer; font-size: 0.75rem;"
                      >
                        🗑️
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Accessible Pagination -->
      <nav aria-label="Table pagination navigation" class="table-pagination">
        <div class="pagination-info">
          Page <strong>${this.currentPage}</strong> of <strong>${totalPages}</strong>
        </div>
        <div class="pagination-controls">
          <button
            type="button"
            class="btn-page"
            id="btn-prev-page"
            ${this.currentPage <= 1 ? 'disabled aria-disabled="true"' : ''}
            aria-label="Previous table page"
          >
            Previous
          </button>
          <button
            type="button"
            class="btn-page"
            id="btn-next-page"
            ${this.currentPage >= totalPages ? 'disabled aria-disabled="true"' : ''}
            aria-label="Next table page"
          >
            Next
          </button>
        </div>
      </nav>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.querySelectorAll<HTMLButtonElement>('.btn-sort').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-sort') as keyof TableRowData;
        if (field) this.handleSort(field);
      });
    });

    this.element.querySelectorAll<HTMLButtonElement>('.btn-row-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const ticketId = btn.getAttribute('data-ticket');
        const row = this.data.find(r => r.trackingId === ticketId);
        if (row && this.onRowSelectCallback) {
          this.onRowSelectCallback(row);
        }
      });
    });

    this.element.querySelectorAll<HTMLButtonElement>('.btn-row-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const ticketId = btn.getAttribute('data-ticket');
        if (ticketId && this.onDeleteCallback) {
          if (window.confirm(`Are you sure you want to delete incident ticket ${ticketId}?`)) {
            this.onDeleteCallback(ticketId);
          }
        }
      });
    });

    const toggleMineBtn = this.element.querySelector('#btn-toggle-mine-filter');
    toggleMineBtn?.addEventListener('click', () => {
      this.filterOnlyMine = !this.filterOnlyMine;
      this.currentPage = 1;
      this.render();
      announceToScreenReader(this.filterOnlyMine ? 'Filtered to your submitted requests only.' : 'Showing all city requests.');
    });

    const resetBtn = this.element.querySelector('#btn-reset-table-filter');
    resetBtn?.addEventListener('click', () => {
      this.filterOnlyMine = false;
      this.currentPage = 1;
      this.render();
    });

    const prevBtn = this.element.querySelector('#btn-prev-page');
    prevBtn?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
      }
    });

    const nextBtn = this.element.querySelector('#btn-next-page');
    nextBtn?.addEventListener('click', () => {
      const filtered = this.getFilteredData();
      const totalPages = Math.ceil(filtered.length / this.pageSize);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.render();
      }
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}
