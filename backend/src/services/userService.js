import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../config/database.js';
import {
  DEFAULT_GAME_NAME,
  DEFAULT_GAME_PASSWORD,
  DEFAULT_GAME_USERNAME,
} from '../constants/userDefaults.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads/avatars');
const DEFAULT_USER_ID = 1;

const selectProfile = db.prepare(`
  SELECT id, name, username, avatar_path, password_set_by_user, created_at, updated_at
  FROM users
  WHERE id = ?
`);

const selectAuth = db.prepare(`
  SELECT id, name, username, password_hash, avatar_path, password_set_by_user, created_at, updated_at
  FROM users
  WHERE id = ?
`);

const selectByUsername = db.prepare(`
  SELECT id
  FROM users
  WHERE username = ? AND id != ?
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, name, username, password_hash, avatar_path, password_set_by_user)
  VALUES (?, ?, ?, ?, NULL, 0)
`);

const updateProfileStmt = db.prepare(`
  UPDATE users
  SET name = ?, username = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const updatePasswordStmt = db.prepare(`
  UPDATE users
  SET password_hash = ?, password_set_by_user = 1, updated_at = datetime('now')
  WHERE id = ?
`);

const updateAvatarStmt = db.prepare(`
  UPDATE users
  SET avatar_path = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const repairBootstrapUserStmt = db.prepare(`
  UPDATE users
  SET name = ?, username = ?, password_hash = ?, password_set_by_user = 0, updated_at = datetime('now')
  WHERE id = ?
`);

function normalizeName(value) {
  return String(value ?? '').trim();
}

function normalizeUsername(value) {
  return String(value ?? '').trim();
}

export function validateName(name) {
  const normalized = normalizeName(name);

  if (normalized.length < 2) {
    return { ok: false, error: 'Name must be at least 2 characters.' };
  }

  if (normalized.length > 80) {
    return { ok: false, error: 'Name must be 80 characters or fewer.' };
  }

  return { ok: true, value: normalized };
}

export function validateUsername(username) {
  const normalized = normalizeUsername(username);

  if (normalized.length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters.' };
  }

  if (normalized.length > 30) {
    return { ok: false, error: 'Username must be 30 characters or fewer.' };
  }

  if (!/^[A-Za-z0-9_]+$/.test(normalized)) {
    return { ok: false, error: 'Username may only contain letters, numbers, and underscores.' };
  }

  return { ok: true, value: normalized };
}

export function validateNewPassword(password) {
  const normalized = String(password ?? '');

  if (normalized.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' };
  }

  if (normalized.length > 128) {
    return { ok: false, error: 'New password must be 128 characters or fewer.' };
  }

  return { ok: true, value: normalized };
}

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function repairBootstrapUserIfNeeded(existing) {
  if (!existing || existing.password_set_by_user) {
    return existing;
  }

  const auth = selectAuth.get(DEFAULT_USER_ID);
  const hasBootstrapCredentials =
    auth &&
    auth.username === DEFAULT_GAME_USERNAME &&
    verifyPassword(DEFAULT_GAME_PASSWORD, auth.password_hash);

  if (hasBootstrapCredentials) {
    return existing;
  }

  repairBootstrapUserStmt.run(
    DEFAULT_GAME_NAME,
    DEFAULT_GAME_USERNAME,
    hashPassword(DEFAULT_GAME_PASSWORD),
    DEFAULT_USER_ID,
  );

  console.log(
    `[user] Repaired bootstrap game user "${DEFAULT_GAME_USERNAME}"`,
  );

  return selectProfile.get(DEFAULT_USER_ID);
}

export function ensureDefaultUser() {
  ensureUploadsDir();

  const existing = selectProfile.get(DEFAULT_USER_ID);
  if (existing) {
    return repairBootstrapUserIfNeeded(existing);
  }

  insertUser.run(
    DEFAULT_USER_ID,
    DEFAULT_GAME_NAME,
    DEFAULT_GAME_USERNAME,
    hashPassword(DEFAULT_GAME_PASSWORD),
  );
  console.log(`[user] Seeded bootstrap game user "${DEFAULT_GAME_USERNAME}"`);
  return selectProfile.get(DEFAULT_USER_ID);
}

export function getUserProfile() {
  ensureDefaultUser();
  return selectProfile.get(DEFAULT_USER_ID) ?? null;
}

export function updateUserProfile({ name, username }) {
  ensureDefaultUser();

  const nameResult = validateName(name);
  if (!nameResult.ok) {
    return nameResult;
  }

  const usernameResult = validateUsername(username);
  if (!usernameResult.ok) {
    return usernameResult;
  }

  const duplicate = selectByUsername.get(usernameResult.value, DEFAULT_USER_ID);
  if (duplicate) {
    return { ok: false, error: 'Username is already taken.' };
  }

  updateProfileStmt.run(nameResult.value, usernameResult.value, DEFAULT_USER_ID);
  return { ok: true, profile: getUserProfile() };
}

export function changeUserPassword({ oldPassword, newPassword }) {
  ensureDefaultUser();

  const auth = selectAuth.get(DEFAULT_USER_ID);
  if (!auth) {
    return { ok: false, error: 'User account not found.' };
  }

  const passwordIsSet = Boolean(auth.password_set_by_user);

  if (passwordIsSet) {
    if (!oldPassword) {
      return { ok: false, error: 'Old password is required.' };
    }

    if (!verifyPassword(String(oldPassword), auth.password_hash)) {
      return { ok: false, error: 'Old password is incorrect.' };
    }
  }

  const passwordResult = validateNewPassword(newPassword);
  if (!passwordResult.ok) {
    return passwordResult;
  }

  updatePasswordStmt.run(hashPassword(passwordResult.value), DEFAULT_USER_ID);
  return { ok: true };
}

export function updateUserAvatar(relativePath, absolutePath) {
  ensureDefaultUser();

  const current = selectAuth.get(DEFAULT_USER_ID);
  if (current?.avatar_path) {
    const previousAbsolute = path.join(getUploadsDir(), path.basename(current.avatar_path));
    if (fs.existsSync(previousAbsolute)) {
      fs.unlinkSync(previousAbsolute);
    }
  }

  updateAvatarStmt.run(relativePath, DEFAULT_USER_ID);
  return { ok: true, profile: getUserProfile(), absolutePath };
}

export function getUploadsDir() {
  ensureUploadsDir();
  return UPLOADS_DIR;
}
