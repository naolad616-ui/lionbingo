import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_THEME_ID,
  getThemeById,
  THEME_STORAGE_KEY,
} from '../config/themes';

const ThemeContext = createContext(null);

function applyThemeVariables(theme) {
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.setAttribute('data-theme', theme.id);
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID;
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_ID;
  });

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  useEffect(() => {
    applyThemeVariables(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  }, [theme]);

  const setTheme = useCallback((id) => {
    setThemeId(id);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      themeId,
      setTheme,
    }),
    [theme, themeId, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
