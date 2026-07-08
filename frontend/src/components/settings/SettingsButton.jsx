const variants = {
  yellow: 'bg-lion-btn-yellow text-white hover:bg-[#c99a38] active:bg-[#b88d32]',
  blue: 'bg-lion-btn-blue text-white hover:bg-[#57b3dc] active:bg-[#4da8d1]',
  pink: 'bg-lion-btn-pink text-white hover:bg-[#df767c] active:bg-[#d66b71]',
};

export default function SettingsButton({
  children,
  variant = 'blue',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium shadow-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lion-red ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
