export default function IconButton({ children, label, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lion-red ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
