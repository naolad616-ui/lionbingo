import { fetchCartela } from '../services/api';
import { isBrowserOnline } from './networkStatus';

/** In-memory cartela payloads so Check Cartela can skip the network. */
const cartelaResponseCache = new Map();
/** In-flight fetches keyed by cartela number string. */
const inflightFetches = new Map();

function normalizeCartelaIds(cardIds) {
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return [];
  }

  return [...new Set(
    cardIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id >= 1 && id <= 150),
  )];
}

export function peekCachedCartela(cartelaNo) {
  const key = String(cartelaNo ?? '').trim();
  const cached = cartelaResponseCache.get(key);
  if (!cached) {
    return { ok: false, error: 'not-found', fromCache: false };
  }

  return { ok: true, data: cached, fromCache: true };
}

export function clearCartelaCache() {
  cartelaResponseCache.clear();
  inflightFetches.clear();
}

async function fetchAndCacheCartela(key) {
  const existing = inflightFetches.get(key);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const started = performance.now();
    const result = await fetchCartela(key);
    console.log('[check-cartela-profile]', JSON.stringify({
      step: 'getCachedCartela',
      cartelaNo: key,
      fromCache: false,
      fetchMs: Number((performance.now() - started).toFixed(2)),
      ok: result.ok,
    }));

    if (result.ok && result.data) {
      cartelaResponseCache.set(key, result.data);
    }

    return result;
  })().finally(() => {
    inflightFetches.delete(key);
  });

  inflightFetches.set(key, request);
  return request;
}

export async function getCachedCartela(cartelaNo, { allowNetwork = true } = {}) {
  const key = String(cartelaNo ?? '').trim();
  const cached = peekCachedCartela(key);
  if (cached.ok) {
    return cached;
  }

  if (!allowNetwork || !isBrowserOnline()) {
    return { ok: false, error: 'not-found', fromCache: false };
  }

  return fetchAndCacheCartela(key);
}

/**
 * Warm the cartela response cache for the given selected cartelas so CHECK
 * works offline for every selected card — not only ones already checked online.
 * Safe to call repeatedly; only fetches IDs that are not yet cached.
 */
export function preloadCartelas(cardIds = []) {
  const ids = normalizeCartelaIds(cardIds);
  if (ids.length === 0) {
    return Promise.resolve(true);
  }

  return (async () => {
    const missing = ids.filter((id) => !cartelaResponseCache.has(String(id)));
    if (missing.length === 0) {
      console.log('[check-cartela-profile]', JSON.stringify({
        step: 'preloadCartelas',
        requested: ids.length,
        loaded: 0,
        alreadyCached: ids.length,
        cacheSize: cartelaResponseCache.size,
      }));
      return true;
    }

    if (!isBrowserOnline()) {
      console.warn('[check-cartela-profile]', JSON.stringify({
        step: 'preloadCartelas',
        requested: ids.length,
        missing: missing.length,
        skippedOffline: true,
        cacheSize: cartelaResponseCache.size,
      }));
      return false;
    }

    const batchSize = 10;
    let loaded = 0;

    for (let index = 0; index < missing.length; index += batchSize) {
      const batch = missing.slice(index, index + batchSize);
      await Promise.all(batch.map(async (id) => {
        const result = await fetchAndCacheCartela(String(id));
        if (result.ok) {
          loaded += 1;
        }
      }));
    }

    console.log('[check-cartela-profile]', JSON.stringify({
      step: 'preloadCartelas',
      requested: ids.length,
      missing: missing.length,
      loaded,
      cacheSize: cartelaResponseCache.size,
    }));
    return loaded === missing.length;
  })().catch((error) => {
    console.warn('[check-cartela-profile] preloadCartelas failed', error);
    return false;
  });
}
