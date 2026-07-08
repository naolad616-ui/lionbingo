import { loginUser, logoutUser, getSessionUser } from '../services/authService.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  return req.body?.token || req.query?.token || null;
}

export function postLogin(req, res) {
  const result = loginUser({
    username: req.body?.username,
    password: req.body?.password,
  });

  if (!result.ok) {
    res.status(401).json({ error: result.error });
    return;
  }

  res.json({
    ok: true,
    token: result.token,
    profile: result.profile,
  });
}

export function getSession(req, res) {
  const token = extractToken(req);
  const session = getSessionUser(token);

  if (!session) {
    res.status(401).json({ error: 'Session expired or invalid.' });
    return;
  }

  res.json({
    ok: true,
    token: session.token,
    profile: session.profile,
  });
}

export function postLogout(req, res) {
  const token = extractToken(req);
  logoutUser(token);
  res.json({ ok: true });
}
