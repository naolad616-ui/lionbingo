const API_BASE = import.meta.env.VITE_API_URL || '';
const ADMIN_TOKEN_KEY = 'lionbingo-admin-token';

export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token) {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}

export function clearAdminToken() {
  setAdminToken(null);
}

async function adminFetch(path, options = {}) {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export async function adminLogin({ username, password }) {
  const { response, body } = await adminFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    return { ok: false, error: body.error || 'Login failed.' };
  }

  setAdminToken(body.token);
  return {
    ok: true,
    token: body.token,
    expiresAt: body.expiresAt,
    profile: body.profile,
  };
}

export async function fetchAdminSession() {
  const { response, body } = await adminFetch('/api/admin/session');
  if (!response.ok) {
    clearAdminToken();
    return { ok: false, error: body.error || 'Session expired.' };
  }

  return {
    ok: true,
    profile: body.profile,
    expiresAt: body.expiresAt,
  };
}

export async function adminLogout() {
  await adminFetch('/api/admin/logout', { method: 'POST' });
  clearAdminToken();
  return { ok: true };
}

export async function changeAdminPassword({ currentPassword, newPassword }) {
  const { response, body } = await adminFetch('/api/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to change password.' };
  }

  return { ok: true };
}

export async function fetchAdminDashboard(roomId = 'default') {
  const { response, body } = await adminFetch(
    `/api/admin/dashboard?roomId=${encodeURIComponent(roomId)}`,
  );

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to load dashboard.' };
  }

  return { ok: true, data: body };
}

export async function fetchAdminReports(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      query.set(key, value);
    }
  });

  const { response, body } = await adminFetch(`/api/admin/reports?${query.toString()}`);
  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to load reports.' };
  }

  return { ok: true, data: body };
}

export async function fetchAdminCommission() {
  const { response, body } = await adminFetch('/api/admin/commission');
  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to load commission.' };
  }

  return { ok: true, tiers: body.tiers || [] };
}

export async function saveAdminCommission(tiers) {
  const { response, body } = await adminFetch('/api/admin/commission', {
    method: 'PUT',
    body: JSON.stringify({ tiers }),
  });

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to save commission.' };
  }

  return { ok: true, tiers: body.tiers || [] };
}

export async function fetchAdmins() {
  const { response, body } = await adminFetch('/api/admin/admins');
  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to load admins.' };
  }

  return {
    ok: true,
    admins: body.admins || [],
    roles: body.roles || [],
    permissions: body.permissions || [],
  };
}

export async function createAdmin(payload) {
  const { response, body } = await adminFetch('/api/admin/admins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to create admin.' };
  }

  return { ok: true, admin: body.admin };
}

export async function updateAdmin(id, payload) {
  const { response, body } = await adminFetch(`/api/admin/admins/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to update admin.' };
  }

  return { ok: true, admin: body.admin };
}

export async function fetchAdminLoginHistory(limit = 100) {
  const { response, body } = await adminFetch(`/api/admin/login-history?limit=${limit}`);
  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to load login history.' };
  }

  return { ok: true, history: body.history || [] };
}

export async function fetchAdminSettings() {
  const { response, body } = await adminFetch('/api/admin/settings');
  if (!response.ok) {
    return { ok: false, error: body.error || 'Failed to load settings.' };
  }

  return { ok: true, data: body };
}

export function recordsToCsv(records, columns) {
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = columns.map((column) => escape(column.label)).join(',');
  const rows = records.map((record) =>
    columns.map((column) => escape(column.value(record))).join(','),
  );

  return [header, ...rows].join('\n');
}

export function downloadTextFile(filename, content, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
