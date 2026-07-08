export function CameraIcon({ className = 'h-8 w-8' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7.5h2.2l1.2-2h8.2l1.2 2H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z"
      />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}

export function EditProfileIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 4h5v2H6.41L18 17.59 16.59 19 5 7.41V10H3V4Zm14.71-1.71a1 1 0 0 1 1.41 0l2.59 2.59a1 1 0 0 1 0 1.41L10 18.17l-3.59 1 1-3.59L18.71 2.29Z" />
    </svg>
  );
}
