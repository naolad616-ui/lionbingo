import { randomBytes } from 'node:crypto';
import {
  ADMIN_ROLES,
  ROLE_LABELS,
  resolvePermissionsForRole,
} from '../constants/adminRoles.js';
import {
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
} from '../constants/adminDefaults.js';
import {
  AdminLoginHistory,
  AdminSession,
  AdminUser,
  getNextSequence,
} from '../models/index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function mapAdmin(row) {
  if (!row) return null;

  const permissions = resolvePermissionsForRole(
    row.role,
    Array.isArray(row.permissions) ? row.permissions : [],
  );

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

export async function recordAdminActivity({
  adminId = null,
  username,
  action,
  ipAddress = null,
  userAgent = null,
  success = true,
  details = null,
}) {
  const id = await getNextSequence('admin_login_history');
  await AdminLoginHistory.create({
    id,
    admin_id: adminId,
    username: String(username || 'unknown'),
    action: String(action || 'activity'),
    ip_address: ipAddress,
    user_agent: userAgent,
    success: success ? 1 : 0,
    details,
    created_at: nowIso(),
  });
}

export async function ensureDefaultAdmin() {
  const activeSuperAdmins = await AdminUser.countDocuments({
    role: ADMIN_ROLES.SUPER_ADMIN,
    is_active: 1,
  });
  const existing = await AdminUser.findOne({ username: DEFAULT_ADMIN_USERNAME }).lean();
  const bootstrapPermissions = resolvePermissionsForRole(ADMIN_ROLES.SUPER_ADMIN);

  if (existing) {
    if (activeSuperAdmins === 0) {
      await AdminUser.updateOne(
        { id: existing.id },
        {
          $set: {
            password_hash: hashPassword(DEFAULT_ADMIN_PASSWORD),
            permissions: bootstrapPermissions,
            role: ADMIN_ROLES.SUPER_ADMIN,
            name: DEFAULT_ADMIN_NAME,
            is_active: 1,
            updated_at: nowIso(),
          },
        },
      );
      console.log(`[admin] Repaired bootstrap super admin "${DEFAULT_ADMIN_USERNAME}"`);
      const repaired = await AdminUser.findOne({ id: existing.id }).lean();
      return mapAdmin(repaired);
    }

    return mapAdmin(existing);
  }

  const id = await getNextSequence('admin_users');
  const created = await AdminUser.create({
    id,
    name: DEFAULT_ADMIN_NAME,
    username: DEFAULT_ADMIN_USERNAME,
    password_hash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    role: ADMIN_ROLES.SUPER_ADMIN,
    permissions: bootstrapPermissions,
    is_active: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  console.log(`[admin] Seeded bootstrap super admin "${DEFAULT_ADMIN_USERNAME}"`);
  return mapAdmin(created.toObject());
}

export async function loginAdmin({ username, password, ipAddress = null, userAgent = null }) {
  await ensureDefaultAdmin();

  const normalizedUsername = String(username ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedUsername || !normalizedPassword) {
    await recordAdminActivity({
      username: normalizedUsername || 'unknown',
      action: 'login_failed',
      ipAddress,
      userAgent,
      success: false,
      details: 'Missing credentials',
    });
    return { ok: false, error: 'Username and password are required.' };
  }

  const admin = await AdminUser.findOne({ username: normalizedUsername }).lean();
  if (!admin || !admin.is_active || !verifyPassword(normalizedPassword, admin.password_hash)) {
    await recordAdminActivity({
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
  await AdminSession.create({
    token,
    admin_id: admin.id,
    expires_at: expiresAt,
    created_at: nowIso(),
  });

  const profile = mapAdmin(admin);
  await recordAdminActivity({
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

export async function getAdminSession(token) {
  if (!token) return null;

  await ensureDefaultAdmin();

  const session = await AdminSession.findOne({ token }).lean();
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await AdminSession.deleteOne({ token });
    return null;
  }

  const admin = await AdminUser.findOne({ id: session.admin_id }).lean();
  if (!admin || !admin.is_active) {
    await AdminSession.deleteOne({ token });
    return null;
  }

  return {
    token,
    expiresAt: session.expires_at,
    profile: mapAdmin(admin),
  };
}

export async function logoutAdmin(token, meta = {}) {
  const session = token ? await getAdminSession(token) : null;
  if (token) {
    await AdminSession.deleteOne({ token });
  }

  if (session?.profile) {
    await recordAdminActivity({
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

export async function changeAdminPassword(adminId, currentPassword, newPassword) {
  const admin = await AdminUser.findOne({ id: adminId }).lean();
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

  await AdminUser.updateOne(
    { id: adminId },
    {
      $set: {
        password_hash: hashPassword(nextPassword),
        updated_at: nowIso(),
      },
    },
  );
  await AdminSession.deleteMany({ admin_id: adminId });

  await recordAdminActivity({
    adminId,
    username: admin.username,
    action: 'password_changed',
    success: true,
  });

  return { ok: true };
}

export async function createAdminUser({
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

  const existing = await AdminUser.findOne({ username: normalizedUsername }).lean();
  if (existing) {
    return { ok: false, error: 'Username already exists.' };
  }

  const resolvedPermissions = resolvePermissionsForRole(normalizedRole, permissions);
  const id = await getNextSequence('admin_users');

  const createdDoc = await AdminUser.create({
    id,
    name: normalizedName,
    username: normalizedUsername,
    password_hash: hashPassword(normalizedPassword),
    role: normalizedRole,
    permissions: resolvedPermissions,
    is_active: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  const created = mapAdmin(createdDoc.toObject());

  await recordAdminActivity({
    adminId: actor?.id ?? null,
    username: actor?.username ?? 'system',
    action: 'admin_created',
    success: true,
    details: `Created ${created.username} (${created.roleLabel})`,
  });

  return { ok: true, admin: created };
}

export async function listAdminUsers() {
  await ensureDefaultAdmin();
  const admins = await AdminUser.find({}).sort({ created_at: 1, id: 1 }).lean();
  return admins.map(mapAdmin);
}

export async function updateAdminUser(adminId, updates = {}, actor = null) {
  const admin = await AdminUser.findOne({ id: adminId }).lean();
  if (!admin) {
    return { ok: false, error: 'Admin not found.' };
  }

  const activeSuperAdmins = await AdminUser.countDocuments({
    role: ADMIN_ROLES.SUPER_ADMIN,
    is_active: 1,
  });

  if (
    admin.role === ADMIN_ROLES.SUPER_ADMIN
    && updates.isActive === false
    && activeSuperAdmins <= 1
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

  await AdminUser.updateOne(
    { id: adminId },
    {
      $set: {
        permissions: nextPermissions,
        role: nextRole,
        name: nextName,
        is_active: nextActive ? 1 : 0,
        updated_at: nowIso(),
      },
    },
  );

  if (!nextActive) {
    await AdminSession.deleteMany({ admin_id: adminId });
  }

  const updatedDoc = await AdminUser.findOne({ id: adminId }).lean();
  const updated = mapAdmin(updatedDoc);

  await recordAdminActivity({
    adminId: actor?.id ?? null,
    username: actor?.username ?? 'system',
    action: 'admin_updated',
    success: true,
    details: `Updated ${updated.username}`,
  });

  return { ok: true, admin: updated };
}

export async function getAdminLoginHistory(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const rows = await AdminLoginHistory.find({})
    .sort({ created_at: -1, id: -1 })
    .limit(safeLimit)
    .lean();
  return rows.map(mapLoginHistory);
}
