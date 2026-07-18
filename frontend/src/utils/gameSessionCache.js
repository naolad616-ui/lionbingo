/**
 * In-memory cache for data locked when a game starts (patterns, etc.)
 * so Check Cartela can stay fully local if the connection drops mid-game.
 */

import { loadSidebarPatternSettings } from './sidebarSettingsStorage';

let cachedPatterns = null;
let cachedSelectedCartelas = null;

export function cacheGamePatterns(patterns) {
  if (!patterns || typeof patterns !== 'object') {
    return;
  }

  cachedPatterns = { ...patterns };
}

export function getCachedGamePatterns() {
  if (cachedPatterns) {
    return { ...cachedPatterns };
  }

  // Seed from sidebar settings so patterns are available before the first CHECK.
  const sidebarPatterns = loadSidebarPatternSettings();
  if (sidebarPatterns && typeof sidebarPatterns === 'object') {
    cachedPatterns = { ...sidebarPatterns };
    return { ...cachedPatterns };
  }

  return null;
}

export function cacheSelectedCartelas(cartelas) {
  if (!Array.isArray(cartelas)) {
    return;
  }

  cachedSelectedCartelas = cartelas
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= 150);
}

export function getCachedSelectedCartelas() {
  return cachedSelectedCartelas ? [...cachedSelectedCartelas] : null;
}

export function clearGameSessionCache() {
  cachedPatterns = null;
  cachedSelectedCartelas = null;
}

/**
 * Warm session caches as soon as Play / caller starts so offline Check
 * does not depend on a prior online CHECK.
 */
export function warmGameSessionCache({ selectedCartelas = [], patterns = null } = {}) {
  cacheSelectedCartelas(selectedCartelas);
  if (patterns && typeof patterns === 'object') {
    cacheGamePatterns(patterns);
  } else if (!cachedPatterns) {
    cacheGamePatterns(loadSidebarPatternSettings());
  }
}
