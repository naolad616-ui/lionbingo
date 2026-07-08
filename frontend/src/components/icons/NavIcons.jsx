export function DashboardIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3 3 10.5V20a1 1 0 0 0 1 1h6v-6h4v6h6a1 1 0 0 0 1-1v-9.5L12 3Z" />
    </svg>
  );
}

export function BingoIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CollectIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="0.5" />
      <rect x="14" y="5" width="4" height="14" rx="0.5" />
    </svg>
  );
}

export function SalesIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 4h-2l-1 2h2l3.6 12.59a2 2 0 0 0 1.9 1.41h7.72a1 1 0 0 0 .95-.68l1.5-4.5a1 1 0 0 0-.95-1.32H9.42L8.7 10H19V8H8.27L7 4Zm-1 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  );
}

export function BalanceIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C9.79 2 8 3.79 8 6v1H7a1 1 0 1 0 0 2h1v2H7a1 1 0 1 0 0 2h1v1c0 2.21 1.79 4 4 4h1v1a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-2v-2h2a1 1 0 1 0 0-2h-2V8h2a1 1 0 1 0 0-2h-1V6c0-2.21-1.79-4-4-4Zm-2 6V6c0-1.1.9-2 2-2s2 .9 2 2v2h-4Z" />
    </svg>
  );
}

export function SettingIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.22-1.14.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.49.4 1.04.72 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.22 1.14-.54 1.63-.94l2.39.96c.26.1.55 0 .69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
    </svg>
  );
}

export function CommissionIcon({ className = 'h-5 w-5' }) {
  return <SettingIcon className={className} />;
}

export function SalesReportIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 10h2v6H7v-6Zm4-4h2v10h-2V9Zm4 2h2v8h-2v-8Z" />
    </svg>
  );
}
