export interface TableRowData {
  trackingId: string;
  category: string;
  address: string;
  borough: string;
  status: 'SUBMITTED' | 'RECEIVED' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  submittedAt: string;
}

export class AccessibleDataTable {
  private element: HTMLElement;
  private data: TableRowData[] = [];
  private sortField: keyof TableRowData = 'submittedAt';
  private sortAsc = false;
  private currentPage = 1;
  private pageSize = 5;
  private onRowSelectCallback?: (row: TableRowData) => void;

  constructor(initialData: TableRowData[], onRowSelect?: (row: TableRowData) => void) {
    this.data = initialData;
    this.onRowSelectCallback = onRowSelect;
    this.element = document.createElement('section');
    this.element.className = 'card-surface data-table-section';
    this.element.setAttribute('aria-labelledby', 'data-table-heading');
    this.render();
  }

  public updateData(newData: TableRowData[]): void {
    this.data = newData;
    this.render();
  }

  private getSortedData(): TableRowData[] {
    return [...this.data].sort((a, b) => {
      const valA = a[this.sortField];
      const valB = b[this.sortField];
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
  }

  private render(): void {
    const sorted = this.getSortedData();
    const totalPages = Math.ceil(sorted.length / this.pageSize) || 1;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageRows = sorted.slice(startIndex, startIndex + this.pageSize);

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
        <div class="table-actions">
          <span class="table-total-count" aria-live="polite">
            Showing <strong>${pageRows.length}</strong> of <strong>${this.data.length}</strong> total records
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
            <col style="width: 15%;" />
            <col style="width: 25%;" />
            <col style="width: 25%;" />
            <col style="width: 15%;" />
            <col style="width: 10%;" />
            <col style="width: 10%;" />
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
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
                  No incident records match the current criteria.
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
                  <button
                    type="button"
                    class="btn-row-action"
                    data-ticket="${row.trackingId}"
                    aria-label="Inspect details for incident ticket ${row.trackingId}"
                  >
                    View
                  </button>
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

    const prevBtn = this.element.querySelector('#btn-prev-page');
    prevBtn?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
      }
    });

    const nextBtn = this.element.querySelector('#btn-next-page');
    nextBtn?.addEventListener('click', () => {
      const totalPages = Math.ceil(this.data.length / this.pageSize);
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
