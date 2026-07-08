export const BET_STORAGE_KEY = 'lionbingo-game-bet-amount';
export const BET_STEP = 10;
export const DEFAULT_BET_AMOUNT = 10;

export function normalizeBetAmount(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed < BET_STEP) {
    return DEFAULT_BET_AMOUNT;
  }

  return Math.round(parsed / BET_STEP) * BET_STEP;
}

export function resolveBetAmount(...candidates) {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') {
      continue;
    }

    const parsed = Number.parseInt(String(candidate), 10);
    if (Number.isInteger(parsed) && parsed >= BET_STEP) {
      return normalizeBetAmount(parsed);
    }
  }

  return DEFAULT_BET_AMOUNT;
}

export function persistBetAmount(betAmount) {
  try {
    localStorage.setItem(BET_STORAGE_KEY, String(resolveBetAmount(betAmount)));
  } catch {
    // Ignore storage errors.
  }
}

export function readStoredBetAmount() {
  try {
    return localStorage.getItem(BET_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function stepBetAmount(value, direction) {
  const current = resolveBetAmount(value);
  if (direction < 0) {
    return Math.max(BET_STEP, current - BET_STEP);
  }

  return current + BET_STEP;
}
