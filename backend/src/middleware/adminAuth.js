import { getAdminSession } from '../services/adminAuthService.js';
import { roleHasPermission } from '../constants/adminRoles.js';

export function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim() || null;
}

export async function requireAdminAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    const session = await getAdminSession(token);

    if (!session) {
      return res.status(401).json({ error: 'Admin authentication required.' });
    }

    req.admin = session.profile;
    req.adminToken = session.token;
    req.adminExpiresAt = session.expiresAt;
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Admin auth failed.' });
  }
}

export function requireAdminPermission(permission) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Admin authentication required.' });
    }

    if (!roleHasPermission(req.admin.role, req.admin.permissions, permission)) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    return next();
  };
}

export function getRequestMeta(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || null,
    userAgent: req.headers['user-agent'] || null,
  };
}
