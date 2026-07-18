/**
 * In-memory cache for data locked when a game starts (patterns, etc.)
 * so Check Cartela can stay fully local if the connection drops mid-game.
 */

let cachedPatterns = null;

export function cacheGamePatterns(patterns) {
  if (!patterns || typeof patterns !== 'object') {
    return;
  }

  cachedPatterns = { ...patterns };
}

export function getCachedGamePatterns() {
  return cachedPatterns ? { ...cachedPatterns } : null;
}

export function clearGameSessionCache() {
  cachedPatterns = null;
}
