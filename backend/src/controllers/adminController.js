import {
  changeAdminPassword,
  createAdminUser,
  getAdminLoginHistory,
  getAdminSession,
  listAdminUsers,
  loginAdmin,
  logoutAdmin,
  updateAdminUser,
} from '../services/adminAuthService.js';
import { getAdminDashboard, getAdminReports } from '../services/adminDashboardService.js';
import { getRequestMeta } from '../middleware/adminAuth.js';
import { ADMIN_PERMISSIONS, ADMIN_ROLES, ROLE_LABELS } from '../constants/adminRoles.js';
import {
  getCommissionTiers,
  saveCommissionTiers,
} from '../services/commissionService.js';

export async function postAdminLogin(req, res) {
  const meta = getRequestMeta(req);
  const result = await loginAdmin({
    username: req.body?.username,
    password: req.body?.password,
    ...meta,
  });

  if (!result.ok) {
    return res.status(401).json({ error: result.error });
  }

  return res.json({
    token: result.token,
    expiresAt: result.expiresAt,
    profile: result.profile,
  });
}

export function getAdminSessionHandler(req, res) {
  return res.json({
    profile: req.admin,
    expiresAt: req.adminExpiresAt,
  });
}

export async function postAdminLogout(req, res) {
  await logoutAdmin(req.adminToken, getRequestMeta(req));
  return res.json({ ok: true });
}

export async function postAdminChangePassword(req, res) {
  const result = await changeAdminPassword(
    req.admin.id,
    req.body?.currentPassword,
    req.body?.newPassword,
  );

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({ ok: true });
}

export async function getAdminDashboardHandler(req, res) {
  const roomId = req.query.roomId || 'default';
  return res.json(await getAdminDashboard(roomId));
}

export async function getAdminReportsHandler(req, res) {
  const reports = await getAdminReports({
    period: req.query.period,
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    search: req.query.search,
  });
  return res.json(reports);
}

export function getAdminCommissionHandler(_req, res) {
  return res.json({ tiers: getCommissionTiers() });
}

export async function putAdminCommissionHandler(req, res) {
  const payload = req.body?.tiers ?? req.body ?? {};
  const tiers = await saveCommissionTiers(payload);

  const io = req.app.get('io');
  if (io) {
    io.emit('commission:updated', { tiers });
  }

  return res.json({ tiers });
}

export async function getAdminsHandler(_req, res) {
  return res.json({
    admins: await listAdminUsers(),
    roles: Object.values(ADMIN_ROLES).map((role) => ({
      id: role,
      label: ROLE_LABELS[role],
    })),
    permissions: ADMIN_PERMISSIONS,
  });
}

export async function postCreateAdminHandler(req, res) {
  const result = await createAdminUser({
    name: req.body?.name,
    username: req.body?.username,
    password: req.body?.password,
    role: req.body?.role,
    permissions: req.body?.permissions,
    actor: req.admin,
  });

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json({ admin: result.admin });
}

export async function patchAdminHandler(req, res) {
  const adminId = Number(req.params.id);
  if (!Number.isFinite(adminId)) {
    return res.status(400).json({ error: 'Invalid admin id.' });
  }

  const result = await updateAdminUser(adminId, {
    name: req.body?.name,
    role: req.body?.role,
    permissions: req.body?.permissions,
    isActive: req.body?.isActive,
  }, req.admin);

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({ admin: result.admin });
}

export async function getAdminLoginHistoryHandler(req, res) {
  const limit = Number(req.query.limit || 100);
  return res.json({ history: await getAdminLoginHistory(limit) });
}

export async function getAdminSettingsHandler(req, res) {
  const session = await getAdminSession(req.adminToken);
  return res.json({
    profile: session?.profile || req.admin,
    expiresAt: session?.expiresAt || req.adminExpiresAt,
    sessionTtlHours: 8,
  });
}
