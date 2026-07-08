export const SIDEBAR_SOUND_KEY = 'lionbingo-sidebar-sound-settings';
export const SIDEBAR_PATTERN_KEY = 'lionbingo-sidebar-checking-patterns';

export const SIDEBAR_VOICE_OPTIONS = [
  'Lion Male',
  'Lion Female',
  'Neutral Male',
  'Neutral Female',
];

export const SIDEBAR_DEFAULT_PATTERNS = {
  anyHorizontal: true,
  anyVertical: true,
  anyDiagonal: true,
  fourSingleCorner: false,
  fourSingleMiddle: false,
  fourMiddleCross: false,
  checkCurrentBall: true,
};

export const SIDEBAR_PATTERN_ITEMS = [
  { id: 'anyHorizontal', label: 'Any Horizontal' },
  { id: 'anyVertical', label: 'Any Vertical' },
  { id: 'anyDiagonal', label: 'Any Diagonal' },
  { id: 'fourSingleCorner', label: '4 Single Corner' },
  { id: 'fourSingleMiddle', label: '4 Single Middle' },
  { id: 'fourMiddleCross', label: '4 Middle Cross' },
  { id: 'checkCurrentBall', label: 'Check Current Ball' },
];

export function loadSidebarSoundSettings() {
  try {
    const raw = localStorage.getItem(SIDEBAR_SOUND_KEY);
    if (!raw) return { speed: '4', voice: 'Lion Male' };
    return JSON.parse(raw);
  } catch {
    return { speed: '4', voice: 'Lion Male' };
  }
}

export function saveSidebarSoundSettings(settings) {
  localStorage.setItem(SIDEBAR_SOUND_KEY, JSON.stringify(settings));
}

export function loadSidebarPatternSettings() {
  try {
    const raw = localStorage.getItem(SIDEBAR_PATTERN_KEY);
    if (!raw) return { ...SIDEBAR_DEFAULT_PATTERNS };
    return { ...SIDEBAR_DEFAULT_PATTERNS, ...JSON.parse(raw) };
  } catch {
    return { ...SIDEBAR_DEFAULT_PATTERNS };
  }
}

export function saveSidebarPatternSettings(patterns) {
  localStorage.setItem(SIDEBAR_PATTERN_KEY, JSON.stringify(patterns));
}
