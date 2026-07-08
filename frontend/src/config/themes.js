export const THEME_STORAGE_KEY = 'lionbingo-theme';

export const LIGHT_THEMES = [
  {
    id: 'white-smoke',
    name: 'White Smoke',
    category: 'light',
    swatch: '#f5f5f5',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#f5f5f5',
      '--color-lion-cream': '#ececec',
      '--color-lion-welcome': '#d8e8f4',
      '--color-lion-header-text': '#1f2937',
    },
  },
  {
    id: 'light-blue',
    name: 'Light Blue',
    category: 'light',
    swatch: '#b8ddf5',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#d4ebf9',
      '--color-lion-cream': '#b8ddf5',
      '--color-lion-welcome': '#c5e3f7',
      '--color-lion-header-text': '#1f2937',
    },
  },
  {
    id: 'pale-green',
    name: 'Pale Green',
    category: 'light',
    swatch: '#c8e0c8',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#dceadc',
      '--color-lion-cream': '#c8e0c8',
      '--color-lion-welcome': '#d4ead4',
      '--color-lion-header-text': '#1f2937',
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    category: 'light',
    swatch: '#f0a8a0',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#f5c4be',
      '--color-lion-cream': '#f0a8a0',
      '--color-lion-welcome': '#f3b8b2',
      '--color-lion-header-text': '#1f2937',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    category: 'light',
    swatch: '#d8d0e8',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#e8e2f2',
      '--color-lion-cream': '#d8d0e8',
      '--color-lion-welcome': '#e0d8ee',
      '--color-lion-header-text': '#1f2937',
    },
  },
  {
    id: 'beige',
    name: 'Beige',
    category: 'light',
    swatch: '#e8dcc8',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#f0e8da',
      '--color-lion-cream': '#e8dcc8',
      '--color-lion-welcome': '#ede4d6',
      '--color-lion-header-text': '#1f2937',
    },
  },
];

export const DARK_THEMES = [
  {
    id: 'charcoal-gray',
    name: 'Charcoal Gray',
    category: 'dark',
    swatch: '#5a6a7a',
    swatchText: '#f5f5f5',
    vars: {
      '--color-lion-page': '#5a6a7a',
      '--color-lion-cream': '#4d5c6b',
      '--color-lion-welcome': '#566676',
      '--color-lion-header-text': '#f5f5f5',
    },
  },
  {
    id: 'dark-slate-blue',
    name: 'Dark Slate Blue',
    category: 'dark',
    swatch: '#2e4a7a',
    swatchText: '#0d1b2a',
    vars: {
      '--color-lion-page': '#2e4a7a',
      '--color-lion-cream': '#243d66',
      '--color-lion-welcome': '#2a4570',
      '--color-lion-header-text': '#e8eef5',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    category: 'dark',
    swatch: '#c62828',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#c62828',
      '--color-lion-cream': '#b52222',
      '--color-lion-welcome': '#cc3333',
      '--color-lion-header-text': '#1a1a1a',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    category: 'dark',
    swatch: '#26a69a',
    swatchText: '#1a1a1a',
    vars: {
      '--color-lion-page': '#26a69a',
      '--color-lion-cream': '#1f968b',
      '--color-lion-welcome': '#2bb3a6',
      '--color-lion-header-text': '#1a1a1a',
    },
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    category: 'dark',
    swatch: '#1a2744',
    swatchText: '#0d1520',
    vars: {
      '--color-lion-page': '#1a2744',
      '--color-lion-cream': '#141f36',
      '--color-lion-welcome': '#1c2d4d',
      '--color-lion-header-text': '#e8eef5',
    },
  },
];

export const ALL_THEMES = [...LIGHT_THEMES, ...DARK_THEMES];

export const DEFAULT_THEME_ID = 'white-smoke';

export function getThemeById(id) {
  return ALL_THEMES.find((theme) => theme.id === id) ?? LIGHT_THEMES[0];
}

export function getThemeShortLabel(name) {
  const firstWord = name.split(' ')[0];
  return firstWord.slice(0, 4);
}
