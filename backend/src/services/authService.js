import { randomBytes } from 'node:crypto';
import db from '../config/database.js';
import { verifyPassword } from '../utils/password.js';
import { ensureDefaultUser, getUserProfile } from './userService.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const selectUserByUsername = db.prepare(`
  SELECT id, name, username, password_hash, avatar_path, password_set_by_user, created_at, updated_at
  FROM users
  WHERE username = ?
`);

const insertSession = db.prepare(`
  INSERT INTO auth_sessions (token, user_id, expires_at)
  VALUES (?, ?, ?)
`);

const selectSession = db.prepare(`
  SELECT token, user_id, expires_at
  FROM auth_sessions
  WHERE token = ?
`);

const deleteSession = db.prepare(`
  DELETE FROM auth_sessions
  WHERE token = ?
`);

function mapProfile(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatarPath: user.avatar_path,
    passwordIsSet: Boolean(user.password_set_by_user),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export function loginUser({ username, password }) {
  ensureDefaultUser();

  const normalizedUsername = String(username ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedUsername || !normalizedPassword) {
    return { ok: false, error: 'Username and password are required.' };
  }

  const user = selectUserByUsername.get(normalizedUsername);
  if (!user || !verifyPassword(normalizedPassword, user.password_hash)) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  insertSession.run(token, user.id, expiresAt);

  return {
    ok: true,
    token,
    profile: mapProfile(user),
  };
}

export function getSessionUser(token) {
  if (!token) {
    return null;
  }

  ensureDefaultUser();

  const session = selectSession.get(token);
  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) < new Date()) {
    deleteSession.run(token);
    return null;
  }

  const profile = getUserProfile();
  if (!profile || profile.id !== session.user_id) {
    deleteSession.run(token);
    return null;
  }

  return {
    token,
    profile: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      avatarPath: profile.avatar_path,
      passwordIsSet: Boolean(profile.password_set_by_user),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
  };
}

export function logoutUser(token) {
  if (token) {
    deleteSession.run(token);
  }

  return { ok: true };
}
