import db from '../config/database.js';
import {
  DEFAULT_GAME_SETUP,
  DEFAULT_PATTERN_SETTINGS,
  DEFAULT_SOUND_SETTINGS,
  SETTINGS_KEYS,
} from '../constants/defaults.js';

const upsertSetting = db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = datetime('now')
`);

const selectSetting = db.prepare('SELECT value FROM settings WHERE key = ?');

function readJson(key, fallback) {
  const row = selectSetting.get(key);
  if (!row?.value) return { ...fallback };

  try {
    return { ...fallback, ...JSON.parse(row.value) };
  } catch {
    return { ...fallback };
  }
}

function writeJson(key, value) {
  upsertSetting.run(key, JSON.stringify(value));
  return value;
}

export function getSoundSettings() {
  return readJson(SETTINGS_KEYS.SOUND, DEFAULT_SOUND_SETTINGS);
}

export function saveSoundSettings(settings) {
  const next = {
    speed: String(settings.speed ?? DEFAULT_SOUND_SETTINGS.speed),
    voice: settings.voice ?? DEFAULT_SOUND_SETTINGS.voice,
  };
  writeJson(SETTINGS_KEYS.SOUND, next);
  return next;
}

export function getPatternSettings() {
  return readJson(SETTINGS_KEYS.PATTERNS, DEFAULT_PATTERN_SETTINGS);
}

export function savePatternSettings(patterns) {
  const next = { ...DEFAULT_PATTERN_SETTINGS, ...patterns };
  writeJson(SETTINGS_KEYS.PATTERNS, next);
  return next;
}

function normalizeGameSetup(settings = {}) {
  const closed = Number.parseInt(String(settings.closed ?? ''), 10);
  const betAmount = Number.parseInt(String(settings.betAmount ?? ''), 10);

  return {
    closed: Number.isInteger(closed) && closed >= 1 ? closed : DEFAULT_GAME_SETUP.closed,
    betAmount: Number.isInteger(betAmount) && betAmount >= 10
      ? Math.round(betAmount / 10) * 10
      : DEFAULT_GAME_SETUP.betAmount,
  };
}

export function getGameSetupSettings() {
  return normalizeGameSetup(readJson(SETTINGS_KEYS.GAME_SETUP, DEFAULT_GAME_SETUP));
}

export function saveGameSetupSettings(settings = {}) {
  const current = getGameSetupSettings();
  const next = normalizeGameSetup({ ...current, ...settings });
  writeJson(SETTINGS_KEYS.GAME_SETUP, next);
  return next;
}

export function getAllSettings() {
  return {
    sound: getSoundSettings(),
    patterns: getPatternSettings(),
    gameSetup: getGameSetupSettings(),
  };
}
