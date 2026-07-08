import { useCallback, useRef, useState } from 'react';
import {
  DARK_THEMES,
  getThemeById,
  getThemeShortLabel,
  LIGHT_THEMES,
} from '../../config/themes';
import { useTheme } from '../../context/ThemeContext';
import useClickOutside from '../../hooks/useClickOutside';
import ThemeDropdown from './ThemeDropdown';
import ThemeTriggerButton from './ThemeTriggerButton';

export default function ColorThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [openPanel, setOpenPanel] = useState(null);
  const containerRef = useRef(null);

  const closePanels = useCallback(() => setOpenPanel(null), []);

  useClickOutside(containerRef, closePanels);

  const activeLightTheme =
    theme.category === 'light' ? theme : getThemeById('white-smoke');
  const activeDarkTheme =
    theme.category === 'dark' ? theme : getThemeById('charcoal-gray');

  const handleSelect = (id) => {
    setTheme(id);
    closePanels();
  };

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  return (
    <div ref={containerRef} className="flex items-center gap-1.5 sm:gap-2">
      <span className="text-sm text-theme-header sm:text-base">Color</span>

      <div className="relative">
        <ThemeTriggerButton
          label={getThemeShortLabel(activeLightTheme.name)}
          swatch={activeLightTheme.swatch}
          isOpen={openPanel === 'light'}
          onClick={() => togglePanel('light')}
          ariaLabel="Select light color theme"
        />
        <ThemeDropdown
          themes={LIGHT_THEMES}
          isOpen={openPanel === 'light'}
          onSelect={handleSelect}
        />
      </div>

      <div className="relative">
        <ThemeTriggerButton
          label={getThemeShortLabel(activeDarkTheme.name)}
          swatch={activeDarkTheme.swatch}
          isOpen={openPanel === 'dark'}
          onClick={() => togglePanel('dark')}
          ariaLabel="Select dark color theme"
        />
        <ThemeDropdown
          themes={DARK_THEMES}
          isOpen={openPanel === 'dark'}
          onSelect={handleSelect}
          align="right"
        />
      </div>
    </div>
  );
}
