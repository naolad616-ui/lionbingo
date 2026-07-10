import { Setting } from '../models/index.js';
import {
  DEFAULT_GAME_SETUP,
  DEFAULT_PATTERN_SETTINGS,
  DEFAULT_SOUND_SETTINGS,
  SETTINGS_KEYS,
} from '../constants/defaults.js';
import {
  buildDefaultCommissionMap,
  COMMISSION_SETTINGS_KEY,
} from '../constants/commissionDefaults.js';

const cache = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function loadSettingsCache() {
  const rows = await Setting.find({}).lean();
  cache.clear();

  for (const row of rows) {
    cache.set(row.key, row.value);
  }

  if (!cache.has(SETTINGS_KEYS.SOUND)) {
    cache.set(SETTINGS_KEYS.SOUND, { ...DEFAULT_SOUND_SETTINGS });
  }
  if (!cache.has(SETTINGS_KEYS.PATTERNS)) {
    cache.set(SETTINGS_KEYS.PATTERNS, { ...DEFAULT_PATTERN_SETTINGS });
  }
  if (!cache.has(SETTINGS_KEYS.GAME_SETUP)) {
    cache.set(SETTINGS_KEYS.GAME_SETUP, { ...DEFAULT_GAME_SETUP });
  }
  if (!cache.has(COMMISSION_SETTINGS_KEY)) {
    cache.set(COMMISSION_SETTINGS_KEY, buildDefaultCommissionMap());
  }
}

export function readCachedSetting(key, fallback = null) {
  if (!cache.has(key)) {
    return fallback == null ? null : clone(fallback);
  }

  const value = cache.get(key);
  if (value && typeof value === 'object' && !Array.isArray(value) && fallback && typeof fallback === 'object') {
    return { ...fallback, ...value };
  }

  return clone(value);
}

export async function writeCachedSetting(key, value) {
  const now = new Date().toISOString();
  cache.set(key, clone(value));

  await Setting.findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        value,
        updated_at: now,
      },
      $setOnInsert: {
        created_at: now,
      },
    },
    { upsert: true, new: true },
  );

  return clone(value);
}
