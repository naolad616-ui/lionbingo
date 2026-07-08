export const SETTINGS_KEYS = {
  SOUND: 'lionbingo-sidebar-sound-settings',
  PATTERNS: 'lionbingo-sidebar-checking-patterns',
  GAME_SETUP: 'lionbingo-game-setup',
};

export const DEFAULT_GAME_SETUP = {
  closed: 1,
  betAmount: 10,
};

export const DEFAULT_SOUND_SETTINGS = {
  speed: '4',
  voice: 'Lion Male',
};

export const DEFAULT_PATTERN_SETTINGS = {
  anyHorizontal: true,
  anyVertical: true,
  anyDiagonal: true,
  fourSingleCorner: false,
  fourSingleMiddle: false,
  fourMiddleCross: false,
  checkCurrentBall: true,
};

export const DEFAULT_SPEED = 4;
export const DEFAULT_CALL_INTERVAL_MS = 2800;
export const DEFAULT_ROOM_ID = 'default';

export function speedToIntervalMs(speedValue) {
  const parsedSpeed = Number.parseFloat(String(speedValue));
  const speed = Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : DEFAULT_SPEED;
  return Math.round((DEFAULT_CALL_INTERVAL_MS * DEFAULT_SPEED) / speed);
}
