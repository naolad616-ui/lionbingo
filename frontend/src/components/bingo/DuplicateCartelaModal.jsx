import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playDuplicateCartelaSound } from '../../utils/gameSound';

export default function DuplicateCartelaModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    void playDuplicateCartelaSound();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const preventClickThrough = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] overflow-hidden bg-black/40">
          <div className="flex justify-center px-4 pt-[calc(var(--lion-header-height)+0.75rem)]">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="duplicate-cartela-title"
              aria-describedby="duplicate-cartela-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-[400px] shrink-0 rounded-2xl bg-white px-6 py-5 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
            >
              <p id="duplicate-cartela-title" className="text-sm text-[#5f6368]">
                lionbingo.org says
              </p>
              <p
                id="duplicate-cartela-message"
                className="mt-4 text-[15px] text-gray-900"
              >
                This card is already selected.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onMouseDown={preventClickThrough}
                  onClick={onClose}
                  className="rounded-full bg-[#2d5a27] px-6 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95"
                >
                  OK
                </button>
                <button
                  type="button"
                  onMouseDown={preventClickThrough}
                  onClick={onClose}
                  className="rounded-full bg-[#d1e7dd] px-6 py-2 text-sm font-medium text-[#0f5132] transition hover:brightness-95 active:brightness-90"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
