export default function LoginLionMark({ className = 'h-56 w-56 sm:h-64 sm:w-64' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M38 118c8-34 26-58 62-58s54 24 62 58"
        stroke="#111111"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M28 72c10-24 34-42 72-42s62 18 72 42"
        stroke="#111111"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M18 58c8-16 24-28 46-28M182 58c-8-16-24-28-46-28"
        stroke="#111111"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M12 44c6-12 18-20 34-20M188 44c-6-12-18-20-34-20"
        stroke="#111111"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="78" cy="88" r="7" fill="#111111" />
      <circle cx="122" cy="88" r="7" fill="#111111" />
      <path
        d="M88 108c8 8 16 8 24 0"
        stroke="#111111"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M100 34v14M72 40l10 16M128 40l-10 16"
        stroke="#111111"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M100 24c-10 0-18 8-18 18"
        stroke="#111111"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EnvelopeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2.94 6.34A2 2 0 0 1 4.72 5h10.56c.69 0 1.31.35 1.68.92L10 11.2 2.94 6.34Z" />
      <path d="M2 7.55V13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.55l-7.45 5.2a2 2 0 0 1-2.3 0L2 7.55Z" />
    </svg>
  );
}

function LockIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm-2 6V6a2 2 0 1 1 4 0v2H8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export { EnvelopeIcon, LockIcon };
