export default function ThemeTriggerButton({
  label,
  swatch,
  isOpen,
  onClick,
  ariaLabel,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-800/80 text-xs font-medium text-gray-900 transition-all duration-200 hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lion-red sm:h-10 sm:w-10 sm:text-sm"
      style={{ backgroundColor: swatch }}
    >
      {label}
    </button>
  );
}
