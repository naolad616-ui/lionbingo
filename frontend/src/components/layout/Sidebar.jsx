import { AnimatePresence, motion } from 'framer-motion';
import { NAV_ITEMS } from '../../config/navigation';
import { useSidebar } from '../../context/SidebarContext';
import SidebarNavItem from './SidebarNavItem';

export default function Sidebar() {
  const { isOpen } = useSidebar();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          id="main-navigation"
          role="navigation"
          aria-label="Main navigation"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="fixed left-0 top-[var(--lion-header-height)] z-[55] h-[calc(100dvh-var(--lion-header-height))] w-[min(280px,78vw)] overflow-y-auto border-r border-gray-200/80 bg-[#f3f4f6] shadow-[4px_0_14px_rgba(0,0,0,0.1)] sm:w-[240px] md:w-[260px]"
        >
          <nav className="py-2">
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <SidebarNavItem item={item} />
                </li>
              ))}
            </ul>
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
