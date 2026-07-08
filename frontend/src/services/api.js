import {
  trackCartelaPurchase,
  trackGameEnd,
  trackGameStart,
} from '../utils/gameSalesTracking';

const API_BASE = import.meta.env.VITE_API_URL || '';
const AUTH_TOKEN_KEY = 'lionbingo-auth-token';

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

export function resolveAssetUrl(assetPath) {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  return `${API_BASE}${assetPath}`;
}

export async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  return response;
}

export async function fetchCartela(cartelaNo) {
  const trimmed = String(cartelaNo ?? '').trim();
  const response = await apiFetch(`/api/cartela/${encodeURIComponent(trimmed)}`);

  if (response.status === 404 || response.status === 500) {
    return { ok: false, status: response.status, error: 'not-found' };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      error: body.error || 'Failed to fetch cartela',
    };
  }

  const data = await response.json();
  return { ok: true, data };
}

export async function fetchGameState(roomId = 'default') {
  const response = await apiFetch(`/api/game/state?roomId=${encodeURIComponent(roomId)}`);

  if (!response.ok) {
    return { ok: false, calledNumbers: [], data: null };
  }

  const data = await response.json();
  return {
    ok: true,
    calledNumbers: Array.isArray(data.calledNumbers) ? data.calledNumbers : [],
    data,
  };
}

export async function configureGameSales({
  betAmount,
  cardsSold,
  selectedCartelas,
  closed,
  roomId = 'default',
}) {
  const response = await apiFetch('/api/game/configure', {
    method: 'POST',
    body: JSON.stringify({ betAmount, cardsSold, selectedCartelas, closed, roomId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Failed to configure game sales' };
  }

  const data = await response.json();
  console.log('[sales-trace] configureGameSales response', {
    source: 'backend',
    sales: data.sales ?? null,
    prize: data.prize ?? null,
  });
  trackCartelaPurchase(data.sales, data.prize);
  return { ok: true, ...data };
}

export async function lockGamePrize({
  betAmount,
  cardsSold,
  selectedCartelas,
  closed,
  roomId = 'default',
}) {
  const response = await apiFetch('/api/game/lock-prize', {
    method: 'POST',
    body: JSON.stringify({ betAmount, cardsSold, selectedCartelas, closed, roomId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Failed to lock game prize' };
  }

  const data = await response.json();
  console.log('[sales-trace] lockGamePrize response', {
    source: 'backend',
    sales: data.sales ?? null,
    prize: data.prize ?? null,
  });
  trackGameStart(data.sales, data.prize);
  return { ok: true, ...data };
}

export async function resetGameState(roomId = 'default', snapshot = {}) {
  const response = await apiFetch('/api/game/reset', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = await response.json();
  trackGameEnd('reset', snapshot);
  return { ok: true, data };
}

export async function shuffleGameState(roomId = 'default') {
  const response = await apiFetch('/api/game/shuffle', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = await response.json();
  return { ok: true, data };
}

export async function fetchSoundSettings() {
  const response = await apiFetch('/api/settings/sound');

  if (!response.ok) {
    return { ok: false, speed: null, voice: null, intervalMs: null };
  }

  const data = await response.json();
  return {
    ok: true,
    speed: data.speed,
    voice: data.voice,
    intervalMs: data.intervalMs,
  };
}

export async function saveSoundSettings({ speed, voice, roomId = 'default' }) {
  const response = await apiFetch('/api/settings/sound', {
    method: 'PUT',
    body: JSON.stringify({ speed, voice, roomId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Failed to save sound settings' };
  }

  const data = await response.json();
  return {
    ok: true,
    speed: data.speed,
    voice: data.voice,
    intervalMs: data.intervalMs,
  };
}

export async function fetchPatternSettings() {
  const response = await apiFetch('/api/settings/patterns');

  if (!response.ok) {
    return { ok: false, patterns: null };
  }

  const patterns = await response.json();
  return { ok: true, patterns };
}

export async function savePatternSettings(patterns) {
  const response = await apiFetch('/api/settings/patterns', {
    method: 'PUT',
    body: JSON.stringify(patterns),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Failed to save pattern settings' };
  }

  const data = await response.json();
  return { ok: true, patterns: data };
}

export async function fetchGameSetupSettings() {
  const response = await apiFetch('/api/settings/game-setup');

  if (!response.ok) {
    return { ok: false, closed: null, betAmount: null };
  }

  const data = await response.json();
  return {
    ok: true,
    closed: data.closed,
    betAmount: data.betAmount,
  };
}

export async function saveGameSetupSettings({ closed, betAmount }) {
  const response = await apiFetch('/api/settings/game-setup', {
    method: 'PUT',
    body: JSON.stringify({ closed, betAmount }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Failed to save game setup settings' };
  }

  const data = await response.json();
  return {
    ok: true,
    closed: data.closed,
    betAmount: data.betAmount,
  };
}

export async function fetchCommissionTiers() {
  const response = await apiFetch('/api/commission');

  if (!response.ok) {
    return { ok: false, tiers: null };
  }

  const data = await response.json();
  return { ok: true, tiers: Array.isArray(data.tiers) ? data.tiers : [] };
}

export async function saveCommissionTiers(tiers) {
  const response = await apiFetch('/api/commission', {
    method: 'PUT',
    body: JSON.stringify({ tiers }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to save commission tiers' };
  }

  return { ok: true, tiers: Array.isArray(body.tiers) ? body.tiers : [] };
}

export async function checkCartelaInGame(cartelaNumber, roomId = 'default') {
  const response = await apiFetch('/api/game/check', {
    method: 'POST',
    body: JSON.stringify({ cartelaNumber, roomId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Failed to check cartela' };
  }

  const data = await response.json();
  return { ok: true, data };
}

export async function fetchUserProfile() {
  const response = await apiFetch('/api/user/profile');

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Failed to load profile.' };
  }

  const data = await response.json();
  return { ok: true, profile: data };
}

export async function updateUserProfile({ name, username }) {
  const response = await apiFetch('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name, username }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to update profile.' };
  }

  return { ok: true, profile: body };
}

export async function uploadUserAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiFetch('/api/user/avatar', {
    method: 'POST',
    body: formData,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to upload profile photo.' };
  }

  return { ok: true, profile: body };
}

export async function changeUserPassword({ oldPassword, newPassword, confirmPassword }) {
  const response = await apiFetch('/api/user/change-password', {
    method: 'POST',
    body: JSON.stringify({
      ...(oldPassword ? { oldPassword } : {}),
      newPassword,
      confirmPassword,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to change password.' };
  }

  return { ok: true, message: body.message || 'Password changed successfully.' };
}

export async function loginUser({ username, password }) {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false, error: body.error || 'Login failed.' };
  }

  return { ok: true, token: body.token, profile: body.profile };
}

export async function fetchAuthSession() {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, error: 'No active session.' };
  }

  const response = await apiFetch('/api/auth/session');
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    clearAuthToken();
    return { ok: false, error: body.error || 'Session expired.' };
  }

  return { ok: true, token: body.token, profile: body.profile };
}

export async function logoutUser() {
  const response = await apiFetch('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  clearAuthToken();

  if (!response.ok) {
    return { ok: false };
  }

  return { ok: true };
}
