const cartelaCheckStates = new Map();
const lockedCartelas = new Set();

function normalizeCartelaKey(cartelaNo) {
  return String(cartelaNo ?? '').trim();
}

export function readCartelaCheckState(cartelaNo) {
  const key = normalizeCartelaKey(cartelaNo);
  if (!key) {
    return null;
  }

  return cartelaCheckStates.get(key) ?? null;
}

export function writeCartelaCheckState(cartelaNo, state) {
  const key = normalizeCartelaKey(cartelaNo);
  if (!key || !state) {
    return;
  }

  cartelaCheckStates.set(key, {
    ...state,
    cartelaNo: key,
  });
}

export function clearCartelaCheckState(cartelaNo) {
  const key = normalizeCartelaKey(cartelaNo);
  if (!key) {
    return;
  }

  cartelaCheckStates.delete(key);
}

export function clearAllCartelaCheckStates() {
  cartelaCheckStates.clear();
}

export function isCartelaLocked(cartelaNo) {
  const key = normalizeCartelaKey(cartelaNo);
  if (!key) {
    return false;
  }

  return lockedCartelas.has(key);
}

export function lockCartela(cartelaNo) {
  const key = normalizeCartelaKey(cartelaNo);
  if (!key) {
    return false;
  }

  lockedCartelas.add(key);
  return true;
}

export function unlockCartela(cartelaNo) {
  const key = normalizeCartelaKey(cartelaNo);
  if (!key) {
    return false;
  }

  return lockedCartelas.delete(key);
}

export function clearAllLockedCartelas() {
  lockedCartelas.clear();
}

export function getLockedCartelas() {
  return [...lockedCartelas];
}

// Backward-compatible aliases used by existing imports.
export const readMissedClaim = readCartelaCheckState;
export const writeMissedClaim = writeCartelaCheckState;
export const clearMissedClaim = clearCartelaCheckState;
export const clearAllMissedClaims = () => {
  clearAllCartelaCheckStates();
  clearAllLockedCartelas();
};
