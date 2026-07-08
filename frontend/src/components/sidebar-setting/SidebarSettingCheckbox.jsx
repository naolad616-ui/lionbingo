export default function SidebarSettingCheckbox({ id, label, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 transition-colors duration-200 hover:bg-gray-50"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded-sm border-gray-300 text-[#4a90e2] transition focus:ring-2 focus:ring-[#4a90e2]/40"
      />
      <span className="text-sm font-medium text-gray-900 sm:text-[15px]">{label}</span>
    </label>
  );
}
