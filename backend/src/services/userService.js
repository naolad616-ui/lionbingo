import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_GAME_NAME,
  DEFAULT_GAME_PASSWORD,
  DEFAULT_GAME_USERNAME,
} from '../constants/userDefaults.js';
import { User } from '../models/index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads/avatars');
const DEFAULT_USER_ID = 1;

function nowIso() {
  return new Date().toISOString();
}

function toProfile(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    name: doc.name,
    username: doc.username,
    avatar_path: doc.avatar_path ?? null,
    password_set_by_user: Number(doc.password_set_by_user ?? 0),
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

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

async function repairBootstrapUserIfNeeded(existing) {
  if (!existing || existing.password_set_by_user) {
    return toProfile(existing);
  }

  const hasBootstrapCredentials =
    existing.username === DEFAULT_GAME_USERNAME
    && verifyPassword(DEFAULT_GAME_PASSWORD, existing.password_hash);

  if (hasBootstrapCredentials) {
    return toProfile(existing);
  }

  const updated = await User.findOneAndUpdate(
    { id: DEFAULT_USER_ID },
    {
      $set: {
        name: DEFAULT_GAME_NAME,
        username: DEFAULT_GAME_USERNAME,
        password_hash: hashPassword(DEFAULT_GAME_PASSWORD),
        password_set_by_user: 0,
        updated_at: nowIso(),
      },
    },
    { new: true },
  ).lean();

  console.log(`[user] Repaired bootstrap game user "${DEFAULT_GAME_USERNAME}"`);
  return toProfile(updated);
}

export async function ensureDefaultUser() {
  ensureUploadsDir();

  const existing = await User.findOne({ id: DEFAULT_USER_ID }).lean();
  if (existing) {
    return repairBootstrapUserIfNeeded(existing);
  }

  const created = await User.create({
    id: DEFAULT_USER_ID,
    name: DEFAULT_GAME_NAME,
    username: DEFAULT_GAME_USERNAME,
    password_hash: hashPassword(DEFAULT_GAME_PASSWORD),
    avatar_path: null,
    password_set_by_user: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  console.log(`[user] Seeded bootstrap game user "${DEFAULT_GAME_USERNAME}"`);
  return toProfile(created.toObject());
}

export async function getUserProfile() {
  await ensureDefaultUser();
  const user = await User.findOne({ id: DEFAULT_USER_ID }).lean();
  return toProfile(user);
}

export async function getUserAuthById(userId = DEFAULT_USER_ID) {
  return User.findOne({ id: userId }).lean();
}

export async function getUserAuthByUsername(username) {
  return User.findOne({ username: String(username ?? '').trim() }).lean();
}

export async function updateUserProfile({ name, username }) {
  await ensureDefaultUser();

  const nameResult = validateName(name);
  if (!nameResult.ok) {
    return nameResult;
  }

  const usernameResult = validateUsername(username);
  if (!usernameResult.ok) {
    return usernameResult;
  }

  const duplicate = await User.findOne({
    username: usernameResult.value,
    id: { $ne: DEFAULT_USER_ID },
  }).lean();

  if (duplicate) {
    return { ok: false, error: 'Username is already taken.' };
  }

  await User.updateOne(
    { id: DEFAULT_USER_ID },
    {
      $set: {
        name: nameResult.value,
        username: usernameResult.value,
        updated_at: nowIso(),
      },
    },
  );

  return { ok: true, profile: await getUserProfile() };
}

export async function changeUserPassword({ oldPassword, newPassword }) {
  await ensureDefaultUser();

  const auth = await getUserAuthById(DEFAULT_USER_ID);
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

  await User.updateOne(
    { id: DEFAULT_USER_ID },
    {
      $set: {
        password_hash: hashPassword(passwordResult.value),
        password_set_by_user: 1,
        updated_at: nowIso(),
      },
    },
  );

  return { ok: true };
}

export async function updateUserAvatar(relativePath, absolutePath) {
  await ensureDefaultUser();

  const current = await getUserAuthById(DEFAULT_USER_ID);
  if (current?.avatar_path) {
    const previousAbsolute = path.join(getUploadsDir(), path.basename(current.avatar_path));
    if (fs.existsSync(previousAbsolute)) {
      fs.unlinkSync(previousAbsolute);
    }
  }

  await User.updateOne(
    { id: DEFAULT_USER_ID },
    {
      $set: {
        avatar_path: relativePath,
        updated_at: nowIso(),
      },
    },
  );

  return { ok: true, profile: await getUserProfile(), absolutePath };
}

export function getUploadsDir() {
  ensureUploadsDir();
  return UPLOADS_DIR;
}
