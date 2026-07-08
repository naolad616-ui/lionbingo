import { useState } from 'react';

export default function WelcomeBanner({ username = 'Abraham5' }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between rounded-md bg-lion-welcome px-4 py-3 text-sm text-gray-700 shadow-sm sm:px-5 sm:py-3.5 sm:text-base"
    >
      <p className="font-normal">
        Welcome <span className="font-medium">{username}</span>
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss welcome message"
        className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-600 transition-colors hover:bg-black/5 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lion-red"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}
