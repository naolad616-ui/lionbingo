import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeDropdown({ themes, isOpen, onSelect, align = 'left' }) {
  const { themeId } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="listbox"
          aria-label="Color theme options"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className={`absolute top-[calc(100%+4px)] z-[70] min-w-[148px] overflow-hidden border border-gray-400/80 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] sm:min-w-[160px] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {themes.map((theme) => {
            const isSelected = theme.id === themeId;

            return (
              <button
                key={theme.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(theme.id)}
                className="flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors duration-150 sm:px-3.5 sm:py-2 sm:text-[15px]"
                style={
                  isSelected
                    ? { backgroundColor: '#2563eb', color: '#ffffff' }
                    : { backgroundColor: theme.swatch, color: theme.swatchText }
                }
              >
                {theme.name}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
