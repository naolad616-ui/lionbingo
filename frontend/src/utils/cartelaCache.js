import { fetchCartela } from '../services/api';
import { isBrowserOnline } from './networkStatus';

/** In-memory cartela payloads so Check Cartela can skip the network. */
const cartelaResponseCache = new Map();
let preloadPromise = null;

export function peekCachedCartela(cartelaNo) {
  const key = String(cartelaNo ?? '').trim();
  const cached = cartelaResponseCache.get(key);
  if (!cached) {
    return { ok: false, error: 'not-found', fromCache: false };
  }

  return { ok: true, data: cached, fromCache: true };
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
}

/**
 * Warm the cartela response cache in the background (batched) so CHECK is local.
 */
export function preloadCartelas(cardIds = null) {
  if (preloadPromise) {
    return preloadPromise;
  }

  const ids = Array.isArray(cardIds) && cardIds.length > 0
    ? [...new Set(cardIds.map((id) => Number(id)).filter((id) => id >= 1 && id <= 150))]
    : Array.from({ length: 150 }, (_, index) => index + 1);

  preloadPromise = (async () => {
    const batchSize = 10;
    let loaded = 0;

    for (let index = 0; index < ids.length; index += batchSize) {
      const batch = ids.slice(index, index + batchSize);
      await Promise.all(batch.map(async (id) => {
        const result = await getCachedCartela(String(id));
        if (result.ok) {
          loaded += 1;
        }
      }));
      await new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });
    }

    console.log('[check-cartela-profile]', JSON.stringify({
      step: 'preloadCartelas',
      requested: ids.length,
      loaded,
      cacheSize: cartelaResponseCache.size,
    }));
    return true;
  })().catch((error) => {
    console.warn('[check-cartela-profile] preloadCartelas failed', error);
    preloadPromise = null;
    return false;
  });

  return preloadPromise;
}
