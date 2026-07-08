export default function BingoActionButton({
  children,
  className = '',
  variant = 'gradient',
  ...props
}) {
  return (
    <button
      type="button"
      className={`bingo-action-btn bingo-action-btn--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
