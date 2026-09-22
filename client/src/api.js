/**
 * Modular RESTful API Client (api.js)
 * Asynchronous ES6+ client with public REST API fetching,
 * AbortController timeouts, and localStorage cache-aside layer.
 */

const PUBLIC_API_URL = 'https://jsonplaceholder.typicode.com/posts?_limit=12';
const CACHE_KEY = 'civic_portal_api_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// Civic category enrichment map
const CATEGORY_MAP = [
  { name: 'Roadway & Streets', agency: 'DOT', urgency: 'HIGH', borough: 'Manhattan' },
  { name: 'Public Lighting', agency: 'DOT', urgency: 'MEDIUM', borough: 'Brooklyn' },
  { name: 'Sanitation & Debris', agency: 'DSNY', urgency: 'HIGH', borough: 'Queens' },
  { name: 'Housing & Safety', agency: 'HPD', urgency: 'EMERGENCY', borough: 'Bronx' },
  { name: 'Parks & Environment', agency: 'DPR', urgency: 'MEDIUM', borough: 'Staten Island' }
];

const STATUS_OPTIONS = ['SUBMITTED', 'RECEIVED', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED'];

/**
 * Retrieves cached response from localStorage if within TTL
 */
export function getCachedData(key = CACHE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const now = Date.now();
    if (parsed.expiry && now > parsed.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.warn('[API Cache] Unable to read localStorage cache:', err);
    return null;
  }
}

/**
 * Stores response into localStorage with TTL timestamp
 */
export function setCachedData(data, key = CACHE_KEY, ttlMs = CACHE_TTL_MS) {
  try {
    const payload = {
      data,
      savedAt: Date.now(),
      expiry: Date.now() + ttlMs
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[API Cache] Unable to write to localStorage:', err);
  }
}

/**
 * Clears cached data from localStorage
 */
export function clearApiCache(key = CACHE_KEY) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[API Cache] Error clearing cache:', err);
  }
}

/**
 * Fetches live civic data from public REST API with timeout & cache fallback
 */
export async function fetchCivicFeed(forceRefresh = false) {
  // Check client-side cache first
  if (!forceRefresh) {
    const cached = getCachedData();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log('[API] Serving civic data from localStorage cache.');
      return { data: cached, fromCache: true };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    console.log('[API] Fetching live civic feed from public REST API...');
    const response = await fetch(PUBLIC_API_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Public REST API responded with HTTP status ${response.status}: ${response.statusText}`);
    }

    const rawPosts = await response.json();

    // Map & enrich public API posts into civic incident records
    const enrichedData = rawPosts.map((post, index) => {
      const meta = CATEGORY_MAP[index % CATEGORY_MAP.length];
      const status = STATUS_OPTIONS[index % STATUS_OPTIONS.length];
      const trackingSeq = 1000 + post.id * 142;

      return {
        id: post.id,
        trackingId: `NYC-2026-${trackingSeq}`,
        title: capitalize(post.title.slice(0, 48)),
        description: post.body.slice(0, 140) + '...',
        category: meta.name,
        agency: meta.agency,
        urgency: meta.urgency,
        borough: meta.borough,
        status: status,
        submittedAt: new Date(Date.now() - (index * 3600000 * 4)).toISOString(),
        upvotes: 2 + (post.id * 3) % 29,
        bookmarked: false
      };
    });

    // Save to localStorage cache
    setCachedData(enrichedData);

    return { data: enrichedData, fromCache: false };
  } catch (err) {
    clearTimeout(timeoutId);

    // If abort timeout
    if (err.name === 'AbortError') {
      console.error('[API] Network request timed out after 8 seconds.');
      // Attempt stale cache recovery
      const stale = getCachedData();
      if (stale) return { data: stale, fromCache: true, stale: true };
      throw new Error('Connection timed out while querying municipal dispatch gateway. Please check your network.');
    }

    // Network error recovery
    console.warn('[API] Fetch failure, attempting fallback recovery:', err.message);
    const stale = getCachedData();
    if (stale) {
      return { data: stale, fromCache: true, stale: true };
    }

    throw new Error(err.message || 'Unable to connect to civic public services gateway.');
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
