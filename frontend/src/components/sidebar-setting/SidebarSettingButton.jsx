export default function SidebarSettingButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-sm bg-gradient-to-b from-[#5da3e8] to-[#4a8fd4] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lion-red ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
