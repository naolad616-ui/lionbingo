import { NavLink } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';

export default function SidebarNavItem({ item }) {
  const { close } = useSidebar();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={close}
      className={({ isActive }) =>
        `flex items-center gap-3 px-5 py-3 text-[15px] font-medium transition-colors duration-200 sm:px-6 sm:py-3.5 sm:text-base ${
          isActive
            ? 'bg-black/[0.06] text-gray-900'
            : 'text-gray-800 hover:bg-black/[0.04] hover:text-gray-900'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0 text-gray-900" />
      <span>{item.label}</span>
    </NavLink>
  );
}
