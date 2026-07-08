import { randomBytes } from 'node:crypto';
import db from '../config/database.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  ADMIN_ROLES,
  ROLE_LABELS,
  resolvePermissionsForRole,
} from '../constants/adminRoles.js';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const selectAdminByUsername = db.prepare(`
  SELECT *
  FROM admin_users
  WHERE username = ?
`);

const selectAdminById = db.prepare(`
  SELECT *
  FROM admin_users
  WHERE id = ?
`);

const selectAllAdmins = db.prepare(`
  SELECT *
  FROM admin_users
  ORDER BY datetime(created_at) ASC, id ASC
`);

const insertAdmin = db.prepare(`
  INSERT INTO admin_users (name, username, password_hash, role, permissions, is_active)
  VALUES (?, ?, ?, ?, ?, 1)
`);

const updateAdminPassword = db.prepare(`
  UPDATE admin_users
  SET password_hash = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const updateAdminActive = db.prepare(`
  UPDATE admin_users
  SET is_active = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const updateAdminPermissions = db.prepare(`
  UPDATE admin_users
  SET permissions = ?, role = ?, name = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const insertSession = db.prepare(`
  INSERT INTO admin_sessions (token, admin_id, expires_at)
  VALUES (?, ?, ?)
`);

const selectSession = db.prepare(`
  SELECT token, admin_id, expires_at
  FROM admin_sessions
  WHERE token = ?
`);

const deleteSession = db.prepare(`
  DELETE FROM admin_sessions
  WHERE token = ?
`);

const deleteSessionsForAdmin = db.prepare(`
  DELETE FROM admin_sessions
  WHERE admin_id = ?
`);

const insertLoginHistory = db.prepare(`
  INSERT INTO admin_login_history (admin_id, username, action, ip_address, user_agent, success, details)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const selectLoginHistory = db.prepare(`
  SELECT *
  FROM admin_login_history
  ORDER BY datetime(created_at) DESC, id DESC
  LIMIT ?
`);

const countSuperAdmins = db.prepare(`
  SELECT COUNT(*) AS total
  FROM admin_users
  WHERE role = 'super_admin' AND is_active = 1
`);

function parsePermissions(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapAdmin(row) {
  if (!row) return null;

  const permissions = resolvePermissionsForRole(row.role, parsePermissions(row.permissions));

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    roleLabel: ROLE_LABELS[row.role] || row.role,
    permissions,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLoginHistory(row) {
  return {
    id: row.id,
    adminId: row.admin_id,
    username: row.username,
    action: row.action,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: Boolean(row.success),
    details: row.details,
    createdAt: row.created_at,
  };
}

export function recordAdminActivity({
  adminId = null,
  username,
  action,
  ipAddress = null,
  userAgent = null,
  success = true,
  details = null,
}) {
  insertLoginHistory.run(
    adminId,
    String(username || 'unknown'),
    String(action || 'activity'),
    ipAddress,
    userAgent,
    success ? 1 : 0,
    details,
  );
}

export function ensureDefaultAdmin() {
  const existing = selectAdminByUsername.get('admin');
  if (existing) {
    return mapAdmin(existing);
  }

  const result = insertAdmin.run(
    'Super Admin',
    'admin',
    hashPassword('admin123'),
    ADMIN_ROLES.SUPER_ADMIN,
    JSON.stringify(resolvePermissionsForRole(ADMIN_ROLES.SUPER_ADMIN)),
  );

  return mapAdmin(selectAdminById.get(Number(result.lastInsertRowid)));
}

export function loginAdmin({ username, password, ipAddress = null, userAgent = null }) {
  ensureDefaultAdmin();

  const normalizedUsername = String(username ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedUsername || !normalizedPassword) {
    recordAdminActivity({
      username: normalizedUsername || 'unknown',
      action: 'login_failed',
      ipAddress,
      userAgent,
      success: false,
      details: 'Missing credentials',
    });
    return { ok: false, error: 'Username and password are required.' };
  }

  const admin = selectAdminByUsername.get(normalizedUsername);
  if (!admin || !admin.is_active || !verifyPassword(normalizedPassword, admin.password_hash)) {
    recordAdminActivity({
      adminId: admin?.id ?? null,
      username: normalizedUsername,
      action: 'login_failed',
      ipAddress,
      userAgent,
      success: false,
      details: 'Invalid credentials',
    });
    return { ok: false, error: 'Invalid username or password.' };
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  insertSession.run(token, admin.id, expiresAt);

  const profile = mapAdmin(admin);
  recordAdminActivity({
    adminId: profile.id,
    username: profile.username,
    action: 'login',
    ipAddress,
    userAgent,
    success: true,
    details: `Role: ${profile.roleLabel}`,
  });

  return {
    ok: true,
    token,
    expiresAt,
    profile,
  };
}

export function getAdminSession(token) {
  if (!token) return null;

  ensureDefaultAdmin();

  const session = selectSession.get(token);
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    deleteSession.run(token);
    return null;
  }

  const admin = selectAdminById.get(session.admin_id);
  if (!admin || !admin.is_active) {
    deleteSession.run(token);
    return null;
  }

  return {
    token,
    expiresAt: session.expires_at,
    profile: mapAdmin(admin),
  };
}

export function logoutAdmin(token, meta = {}) {
  const session = token ? getAdminSession(token) : null;
  if (token) {
    deleteSession.run(token);
  }

  if (session?.profile) {
    recordAdminActivity({
      adminId: session.profile.id,
      username: session.profile.username,
      action: 'logout',
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      success: true,
    });
  }

  return { ok: true };
}

export function changeAdminPassword(adminId, currentPassword, newPassword) {
  const admin = selectAdminById.get(adminId);
  if (!admin) {
    return { ok: false, error: 'Admin not found.' };
  }

  if (!verifyPassword(String(currentPassword ?? ''), admin.password_hash)) {
    return { ok: false, error: 'Current password is incorrect.' };
  }

  const nextPassword = String(newPassword ?? '');
  if (nextPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' };
  }

  updateAdminPassword.run(hashPassword(nextPassword), adminId);
  deleteSessionsForAdmin.run(adminId);

  recordAdminActivity({
    adminId,
    username: admin.username,
    action: 'password_changed',
    success: true,
  });

  return { ok: true };
}

export function createAdminUser({
  name,
  username,
  password,
  role = ADMIN_ROLES.ADMIN,
  permissions = null,
  actor = null,
}) {
  const normalizedName = String(name ?? '').trim();
  const normalizedUsername = String(username ?? '').trim();
  const normalizedPassword = String(password ?? '');
  const normalizedRole = Object.values(ADMIN_ROLES).includes(role) ? role : ADMIN_ROLES.ADMIN;

  if (!normalizedName || !normalizedUsername || !normalizedPassword) {
    return { ok: false, error: 'Name, username, and password are required.' };
  }

  if (normalizedPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  if (selectAdminByUsername.get(normalizedUsername)) {
    return { ok: false, error: 'Username already exists.' };
  }

  const resolvedPermissions = resolvePermissionsForRole(normalizedRole, permissions);

  const result = insertAdmin.run(
    normalizedName,
    normalizedUsername,
    hashPassword(normalizedPassword),
    normalizedRole,
    JSON.stringify(resolvedPermissions),
  );

  const created = mapAdmin(selectAdminById.get(Number(result.lastInsertRowid)));

  recordAdminActivity({
    adminId: actor?.id ?? null,
    username: actor?.username ?? 'system',
    action: 'admin_created',
    success: true,
    details: `Created ${created.username} (${created.roleLabel})`,
  });

  return { ok: true, admin: created };
}

export function listAdminUsers() {
  ensureDefaultAdmin();
  return selectAllAdmins.all().map(mapAdmin);
}

export function updateAdminUser(adminId, updates = {}, actor = null) {
  const admin = selectAdminById.get(adminId);
  if (!admin) {
    return { ok: false, error: 'Admin not found.' };
  }

  if (
    admin.role === ADMIN_ROLES.SUPER_ADMIN
    && updates.isActive === false
    && countSuperAdmins.get().total <= 1
  ) {
    return { ok: false, error: 'Cannot deactivate the last Super Admin.' };
  }

  const nextRole = Object.values(ADMIN_ROLES).includes(updates.role)
    ? updates.role
    : admin.role;
  const nextName = String(updates.name ?? admin.name).trim() || admin.name;
  const nextPermissions = resolvePermissionsForRole(nextRole, updates.permissions);
  const nextActive = updates.isActive === undefined
    ? Boolean(admin.is_active)
    : Boolean(updates.isActive);

  updateAdminPermissions.run(
    JSON.stringify(nextPermissions),
    nextRole,
    nextName,
    adminId,
  );
  updateAdminActive.run(nextActive ? 1 : 0, adminId);

  if (!nextActive) {
    deleteSessionsForAdmin.run(adminId);
  }

  const updated = mapAdmin(selectAdminById.get(adminId));

  recordAdminActivity({
    adminId: actor?.id ?? null,
    username: actor?.username ?? 'system',
    action: 'admin_updated',
    success: true,
    details: `Updated ${updated.username}`,
  });

  return { ok: true, admin: updated };
}

export function getAdminLoginHistory(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return selectLoginHistory.all(safeLimit).map(mapLoginHistory);
}

ensureDefaultAdmin();
