export function DollarIcon({ className = 'text-4xl font-bold leading-none sm:text-5xl' }) {
  return (
    <span className={className} aria-hidden="true">
      $
    </span>
  );
}

export function GridIcon({ className = 'h-9 w-9 sm:h-10 sm:w-10' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="0.5" />
      <rect x="13" y="3" width="8" height="8" rx="0.5" />
      <rect x="3" y="13" width="8" height="8" rx="0.5" />
      <rect x="13" y="13" width="8" height="8" rx="0.5" />
    </svg>
  );
}

export function BookIcon({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 3h11a3 3 0 0 1 3 3v14.5a.5.5 0 0 1-.76.43L14 18.5l-5.24 2.43A.5.5 0 0 1 8 20.5V5a2 2 0 0 0-2-2H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1.53.85L6 18.2l.47.22V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function MenuIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ChevronDownIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
