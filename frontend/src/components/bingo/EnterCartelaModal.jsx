import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function EnterCartelaModal({ open, onClose, onConfirm }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    setValue('');
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    onConfirm(trimmed);
    setValue('');

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const preventClickThrough = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] overflow-hidden bg-black/40">
          <div className="flex justify-center px-4 pt-[calc(var(--lion-header-height)+0.75rem)]">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="enter-cartela-title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-[400px] shrink-0 rounded-2xl bg-white px-6 py-5 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
            >
            <p id="enter-cartela-title" className="text-sm text-[#5f6368]">
              lionbingo.org says
            </p>
            <p className="mt-4 text-[15px] text-gray-900">enter cartela number.</p>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit();
                }
              }}
              className="mt-3 w-full rounded border border-[#1a1a1a] bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onMouseDown={preventClickThrough}
                onClick={handleSubmit}
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
