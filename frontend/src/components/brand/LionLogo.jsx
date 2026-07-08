export default function LionLogo({ className = 'h-10 w-10', ...props }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="24" cy="24" r="24" fill="white" />
      <path
        d="M14 30c1.5-6 4-10 10-10s8.5 4 10 10"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18c2-4 5-7 12-7s10 3 12 7"
        stroke="#1a1a1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10 14c1.5-3 4.5-5 8-5M38 14c-1.5-3-4.5-5-8-5"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="19" cy="22" r="1.6" fill="#1a1a1a" />
      <circle cx="29" cy="22" r="1.6" fill="#1a1a1a" />
      <path
        d="M22 26.5c1 1.2 3 1.2 4 0"
        stroke="#1a1a1a"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M24 11v3M18 12l1.5 2.5M30 12l-1.5 2.5"
        stroke="#c9a227"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
