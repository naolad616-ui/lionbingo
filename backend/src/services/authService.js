import { randomBytes } from 'node:crypto';
import { AuthSession } from '../models/index.js';
import { verifyPassword } from '../utils/password.js';
import {
  ensureDefaultUser,
  getUserAuthByUsername,
  getUserProfile,
} from './userService.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

export async function loginUser({ username, password }) {
  await ensureDefaultUser();

  const normalizedUsername = String(username ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedUsername || !normalizedPassword) {
    return { ok: false, error: 'Username and password are required.' };
  }

  const user = await getUserAuthByUsername(normalizedUsername);
  if (!user || !verifyPassword(normalizedPassword, user.password_hash)) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await AuthSession.create({
    token,
    user_id: user.id,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });

  return {
    ok: true,
    token,
    profile: mapProfile(user),
  };
}

export async function getSessionUser(token) {
  if (!token) {
    return null;
  }

  await ensureDefaultUser();

  const session = await AuthSession.findOne({ token }).lean();
  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) < new Date()) {
    await AuthSession.deleteOne({ token });
    return null;
  }

  const profile = await getUserProfile();
  if (!profile || profile.id !== session.user_id) {
    await AuthSession.deleteOne({ token });
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

export async function logoutUser(token) {
  if (token) {
    await AuthSession.deleteOne({ token });
  }

  return { ok: true };
}
