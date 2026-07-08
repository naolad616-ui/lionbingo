export default function StatCard({ value, label, icon, accentColor, iconLabel }) {
  return (
    <article className="flex overflow-hidden rounded-sm bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <div
        className="flex w-[30%] min-w-[88px] max-w-[120px] shrink-0 items-center justify-center py-6 sm:min-w-[100px]"
        style={{ backgroundColor: accentColor }}
        aria-hidden={!iconLabel}
      >
        <div className="text-gray-900">{icon}</div>
        {iconLabel && <span className="sr-only">{iconLabel}</span>}
      </div>
      <div className="flex min-h-[100px] flex-1 flex-col items-center justify-center bg-white px-4 py-6 text-center">
        <p className="text-[2rem] font-normal leading-none text-gray-900 sm:text-[2.25rem]">{value}</p>
        <p className="mt-3 text-sm text-gray-800 sm:text-[15px]">{label}</p>
      </div>
    </article>
  );
}
