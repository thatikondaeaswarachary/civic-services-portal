import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Mock localStorage for Node environment testing
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();

test('Dynamic JavaScript DOM Logic & RESTful API Client Gate (api.js & app.js)', async (t) => {
  const apiJsPath = path.join(rootDir, 'client/src/api.js');
  const appJsPath = path.join(rootDir, 'client/src/app.js');
  const rootApiJsPath = path.join(rootDir, 'api.js');
  const rootAppJsPath = path.join(rootDir, 'app.js');

  assert.ok(fs.existsSync(apiJsPath), 'client/src/api.js must exist');
  assert.ok(fs.existsSync(appJsPath), 'client/src/app.js must exist');
  assert.ok(fs.existsSync(rootApiJsPath), 'root api.js must exist');
  assert.ok(fs.existsSync(rootAppJsPath), 'root app.js must exist');

  const { getCachedData, setCachedData, clearApiCache } = await import('../../client/src/api.js');
  const { CivicAppController } = await import('../../client/src/app.js');

  await t.test('1. Client-side LocalStorage Cache Layer with TTL expiration', () => {
    clearApiCache('test_cache_key');
    assert.equal(getCachedData('test_cache_key'), null, 'Should return null for missing key');

    const sample = [{ id: 1, title: 'Roadway Cave-in' }];
    setCachedData(sample, 'test_cache_key', 5000); // 5 sec TTL
    const retrieved = getCachedData('test_cache_key');
    assert.deepEqual(retrieved, sample, 'Should retrieve cached data within TTL');

    // Simulate expired TTL
    setCachedData(sample, 'test_expired_key', -1000); // Expired 1 sec ago
    assert.equal(getCachedData('test_expired_key'), null, 'Should return null for expired TTL data');
  });

  await t.test('2. CivicAppController State Management & Bookmarking in LocalStorage', () => {
    localStorage.clear();
    const controller = new CivicAppController('dummy-id');

    assert.equal(controller.bookmarks.size, 0, 'Bookmarks should initialize empty');
    controller.toggleBookmark('NYC-2026-1001');
    assert.ok(controller.bookmarks.has('NYC-2026-1001'), 'Ticket should be bookmarked');
    
    // Verify persistence in localStorage
    const saved = JSON.parse(localStorage.getItem('civic_saved_bookmarks_v1'));
    assert.ok(saved.includes('NYC-2026-1001'), 'Bookmark should be persisted in localStorage');

    // Toggle off
    controller.toggleBookmark('NYC-2026-1001');
    assert.equal(controller.bookmarks.has('NYC-2026-1001'), false, 'Bookmark should be removed on second toggle');
  });

  await t.test('3. Real-Time Search Filtering & Category Tab Logic in app.js', () => {
    const controller = new CivicAppController('dummy-id');
    controller.allIncidents = [
      { id: 1, trackingId: 'NYC-2026-1001', title: 'Deep Pothole', description: 'Crosswalk hazard', category: 'Roadway & Streets', urgency: 'HIGH', submittedAt: '2026-09-20' },
      { id: 2, trackingId: 'NYC-2026-2002', title: 'Streetlight Out', description: 'Dark corner', category: 'Public Lighting', urgency: 'MEDIUM', submittedAt: '2026-09-21' },
      { id: 3, trackingId: 'NYC-2026-3003', title: 'Overflowing Baskets', description: 'Trash hazard', category: 'Sanitation & Debris', urgency: 'HIGH', submittedAt: '2026-09-22' }
    ];

    // Filter by Category
    controller.activeCategory = 'Public Lighting';
    controller.searchQuery = '';
    controller.applyFiltersAndSort();
    assert.equal(controller.filteredIncidents.length, 1);
    assert.equal(controller.filteredIncidents[0].trackingId, 'NYC-2026-2002');

    // Filter by Real-Time Search Query
    controller.activeCategory = 'All';
    controller.searchQuery = 'trash';
    controller.applyFiltersAndSort();
    assert.equal(controller.filteredIncidents.length, 1);
    assert.equal(controller.filteredIncidents[0].category, 'Sanitation & Debris');

    // Filter matching Tracking ID
    controller.searchQuery = '1001';
    controller.applyFiltersAndSort();
    assert.equal(controller.filteredIncidents.length, 1);
    assert.equal(controller.filteredIncidents[0].trackingId, 'NYC-2026-1001');
  });

  await t.test('4. Dynamic Sorting Logic without Page Reload', () => {
    const controller = new CivicAppController('dummy-id');
    controller.allIncidents = [
      { id: 1, title: 'B - Pothole', category: 'Roadway & Streets', urgency: 'LOW', submittedAt: '2026-09-10' },
      { id: 2, title: 'A - Gas Leak', category: 'Housing & Safety', urgency: 'EMERGENCY', submittedAt: '2026-09-22' },
      { id: 3, title: 'C - Noise', category: 'Housing & Safety', urgency: 'MEDIUM', submittedAt: '2026-09-15' }
    ];

    // Sort by Urgency (Emergency first)
    controller.activeCategory = 'All';
    controller.searchQuery = '';
    controller.sortCriteria = 'urgency-desc';
    controller.applyFiltersAndSort();
    assert.equal(controller.filteredIncidents[0].urgency, 'EMERGENCY');
    assert.equal(controller.filteredIncidents[1].urgency, 'MEDIUM');
    assert.equal(controller.filteredIncidents[2].urgency, 'LOW');

    // Sort Alphabetically
    controller.sortCriteria = 'title-asc';
    controller.applyFiltersAndSort();
    assert.equal(controller.filteredIncidents[0].title, 'A - Gas Leak');
    assert.equal(controller.filteredIncidents[1].title, 'B - Pothole');
    assert.equal(controller.filteredIncidents[2].title, 'C - Noise');
  });

  await t.test('5. Loading Skeletons & User-Friendly Error Banners Architecture', () => {
    const appJsContent = fs.readFileSync(appJsPath, 'utf-8');
    assert.match(appJsContent, /renderSkeletons/i, 'app.js must provide renderSkeletons() method');
    assert.match(appJsContent, /skeleton-card/i, 'app.js must inject skeleton-card elements');
    assert.match(appJsContent, /renderBanner/i, 'app.js must provide renderBanner() method');
    assert.match(appJsContent, /role="alert"/i, 'Banners must declare role="alert"');
  });
});
