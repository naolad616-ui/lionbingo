export default function SettingsPanel({ icon, title, children }) {
  return (
    <article className="overflow-hidden rounded-sm border border-gray-200/90 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5">
        <span className="text-gray-700">{icon}</span>
        <h2 className="text-xs font-medium uppercase tracking-[0.04em] text-gray-800 sm:text-sm">
          {title}
        </h2>
      </div>
      <div className="h-[3px] bg-lion-settings-accent" aria-hidden="true" />
      <div className="p-4 sm:p-5">{children}</div>
    </article>
  );
}
