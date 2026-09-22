export class CivicAppController {
  mountContainer: HTMLElement | null;
  allIncidents: any[];
  filteredIncidents: any[];
  searchQuery: string;
  activeCategory: string;
  sortCriteria: string;
  bookmarks: Set<string>;
  isLoading: boolean;
  debounceTimer: any;

  constructor(mountContainerId?: string);
  init(): Promise<void>;
  applyFiltersAndSort(): void;
  toggleBookmark(trackingId: string): void;
  renderCards(): void;
  renderSkeletons(count?: number): void;
  renderBanner(message: string, type?: string): void;
}
