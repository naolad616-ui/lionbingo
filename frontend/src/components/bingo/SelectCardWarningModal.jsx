import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function SelectCardWarningModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black/40 px-4"
          onClick={onClose}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="select-card-warning-title"
            aria-describedby="select-card-warning-message"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-[400px] rounded-2xl bg-[#f8f9fa] px-6 py-5 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              id="select-card-warning-title"
              className="text-[15px] font-bold text-gray-900"
            >
              lionbingo.org says
            </p>
            <p
              id="select-card-warning-message"
              className="mt-4 text-[15px] leading-snug text-gray-900"
            >
              Please select a card before playing
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/80 bg-[#2d5a27] px-7 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:brightness-95"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
