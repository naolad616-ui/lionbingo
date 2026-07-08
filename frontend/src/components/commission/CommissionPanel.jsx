import { SidebarSettingGridIcon } from '../sidebar-setting/SidebarSettingIcons';

export default function CommissionPanel({ children }) {
  return (
    <article className="overflow-hidden rounded-sm border border-gray-300 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2 border-b border-[#c5d5e0] bg-[#dce8ef] px-4 py-2.5 sm:px-5">
        <span className="text-[#1a4a7a]">
          <SidebarSettingGridIcon />
        </span>
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#1a4a7a] sm:text-sm">
          EDITING &apos;S COMISSION
        </h2>
      </div>
      <div className="bg-[#fdf8e8] p-4 sm:p-5">{children}</div>
    </article>
  );
}
