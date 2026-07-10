import {
  DEFAULT_GAME_SETUP,
  DEFAULT_PATTERN_SETTINGS,
  DEFAULT_SOUND_SETTINGS,
  SETTINGS_KEYS,
} from '../constants/defaults.js';
import { readCachedSetting, writeCachedSetting } from './settingsCache.js';

export function getSoundSettings() {
  return readCachedSetting(SETTINGS_KEYS.SOUND, DEFAULT_SOUND_SETTINGS);
}

export async function saveSoundSettings(settings) {
  const next = {
    speed: String(settings.speed ?? DEFAULT_SOUND_SETTINGS.speed),
    voice: settings.voice ?? DEFAULT_SOUND_SETTINGS.voice,
  };
  return writeCachedSetting(SETTINGS_KEYS.SOUND, next);
}

export function getPatternSettings() {
  return readCachedSetting(SETTINGS_KEYS.PATTERNS, DEFAULT_PATTERN_SETTINGS);
}

export async function savePatternSettings(patterns) {
  const next = { ...DEFAULT_PATTERN_SETTINGS, ...patterns };
  return writeCachedSetting(SETTINGS_KEYS.PATTERNS, next);
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
  return normalizeGameSetup(
    readCachedSetting(SETTINGS_KEYS.GAME_SETUP, DEFAULT_GAME_SETUP),
  );
}

export async function saveGameSetupSettings(settings = {}) {
  const current = getGameSetupSettings();
  const next = normalizeGameSetup({ ...current, ...settings });
  return writeCachedSetting(SETTINGS_KEYS.GAME_SETUP, next);
}

export function getAllSettings() {
  return {
    sound: getSoundSettings(),
    patterns: getPatternSettings(),
    gameSetup: getGameSetupSettings(),
  };
}
