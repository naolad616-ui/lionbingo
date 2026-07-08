export const CLOSED_STORAGE_KEY = 'lionbingo-game-closed';

export function resolveClosedValue(...candidates) {
  for (const candidate of candidates) {
    const parsed = Number.parseInt(String(candidate ?? ''), 10);
    if (Number.isInteger(parsed) && parsed >= 1) {
      return parsed;
    }
  }

  return 1;
}

export function persistClosedValue(closed) {
  try {
    localStorage.setItem(CLOSED_STORAGE_KEY, String(resolveClosedValue(closed)));
  } catch {
    // Ignore storage errors.
  }
}

export function readStoredClosedValue() {
  try {
    const localValue = localStorage.getItem(CLOSED_STORAGE_KEY);
    if (localValue != null) {
      return localValue;
    }

    return sessionStorage.getItem(CLOSED_STORAGE_KEY);
  } catch {
    return null;
  }
}
