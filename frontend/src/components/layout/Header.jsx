import { useNavigate } from 'react-router-dom';
import LionLogo from '../brand/LionLogo';
import IconButton from '../ui/IconButton';
import ColorThemeSelector from '../theme/ColorThemeSelector';
import UserProfileDropdown from '../ui/UserProfileDropdown';
import useCurrentDateTime from '../../hooks/useCurrentDateTime';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { MenuIcon } from '../icons/StatIcons';

export default function Header() {
  const navigate = useNavigate();
  const dateTime = useCurrentDateTime();
  const { toggle, isOpen } = useSidebar();
  const { displayName } = useUser();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-sm">
      <div className="flex min-h-[56px] w-full items-stretch">
        <div className="flex items-center gap-3 bg-lion-red px-3 py-2 sm:gap-4 sm:px-4 md:px-5">
          <button
            type="button"
            onClick={toggle}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            aria-controls="main-navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <MenuIcon />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="whitespace-nowrap text-base font-bold uppercase tracking-[0.06em] text-white sm:text-[1.35rem]">
              Lion Bingo
            </h1>
            <LionLogo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 bg-lion-cream px-3 py-2 text-theme-header sm:gap-4 sm:px-5 md:gap-6 md:px-6">
          <time
            dateTime={new Date().toISOString()}
            className="hidden text-sm sm:block md:text-base"
          >
            {dateTime}
          </time>

          <div className="flex items-center gap-2 sm:gap-3">
            <ColorThemeSelector />
            <IconButton label="Open chat">Chat</IconButton>
          </div>

          <UserProfileDropdown userName={displayName} onLogout={handleLogout} />
        </div>
      </div>

      <time
        dateTime={new Date().toISOString()}
        className="block border-t border-gray-200 bg-lion-cream px-4 py-2 text-center text-xs text-theme-header sm:hidden"
      >
        {dateTime}
      </time>
    </header>
  );
}
