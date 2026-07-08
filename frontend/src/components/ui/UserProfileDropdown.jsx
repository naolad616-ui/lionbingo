import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from '../icons/StatIcons';
import {
  ProfileLogoutIcon,
  ProfileSettingsIcon,
  ProfileUserIcon,
} from '../icons/ProfileMenuIcons';
import useClickOutside from '../../hooks/useClickOutside';

const MENU_ITEMS = [
  { id: 'profile', label: 'Profile', icon: ProfileUserIcon },
  { id: 'settings', label: 'Settings', icon: ProfileSettingsIcon },
  { id: 'logout', label: 'Logout', icon: ProfileLogoutIcon },
];

export default function UserProfileDropdown({
  userName = 'Abrham',
  onProfile,
  onSettings,
  onLogout,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const closeMenu = useCallback(() => setOpen(false), []);

  useClickOutside(containerRef, closeMenu);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeMenu]);

  const handleItemClick = (itemId) => {
    closeMenu();

    if (itemId === 'profile') {
      onProfile?.();
      navigate('/profile');
      return;
    }
    if (itemId === 'settings') {
      onSettings?.();
      navigate('/settings');
      return;
    }
    if (itemId === 'logout') onLogout?.();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`${userName} account menu`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded px-1 py-1 text-sm font-medium text-gray-900 transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lion-red sm:text-base"
      >
        <span>{userName}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="User account menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+6px)] z-[60] min-w-[148px] overflow-hidden rounded-md border border-gray-200/80 bg-[#ececec] py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.14)] sm:min-w-[156px]"
          >
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleItemClick(item.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:bg-black/[0.06] focus-visible:bg-black/[0.06] focus-visible:outline-none sm:gap-3 sm:px-4 sm:py-2.5 sm:text-[15px]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-700" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
