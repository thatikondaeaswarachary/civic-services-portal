export function getCachedData(key?: string): any;
export function setCachedData(data: any, key?: string, ttlMs?: number): void;
export function clearApiCache(key?: string): void;
export function fetchCivicFeed(forceRefresh?: boolean): Promise<{ data: any[]; fromCache: boolean; stale?: boolean }>;
