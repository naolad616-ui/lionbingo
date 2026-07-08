import { AnimatePresence, motion } from 'framer-motion';
import { useSidebar } from '../../context/SidebarContext';

export default function SidebarOverlay() {
  const { isOpen, close } = useSidebar();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.button
          type="button"
          aria-label="Close navigation menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          className="fixed inset-0 top-[var(--lion-header-height)] z-[54] bg-black/20"
        />
      )}
    </AnimatePresence>
  );
}
