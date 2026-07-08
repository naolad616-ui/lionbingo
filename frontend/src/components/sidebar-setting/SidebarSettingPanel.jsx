export default function SidebarSettingPanel({ icon, title, children }) {
  return (
    <article className="overflow-hidden rounded-sm border border-gray-300 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-2 border-b border-[#c5d5e0] bg-[#dce8ef] px-4 py-2.5 sm:px-5">
        <span className="text-[#1a4a7a]">{icon}</span>
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#1a4a7a] sm:text-sm">
          {title}
        </h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </article>
  );
}
