import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ADMIN_NAV_ITEMS } from '../config/adminNavigation';

export default function AdminLayout() {
  const { profile, logout, hasPermission, loading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center">
        <p className="text-slate-300">Loading admin panel...</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/admin/login" replace />;
  }

  const items = ADMIN_NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <div className="admin-shell min-h-screen lg:flex">
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-40 w-64 transform transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-amber-500/20 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Lion Bingo</p>
          <h1 className="mt-1 text-xl font-bold text-white">Admin Panel</h1>
          <p className="mt-2 text-sm text-slate-400">{profile.roleLabel}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/admin'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="text-base opacity-80">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium text-white">{profile.name}</p>
          <p className="truncate text-xs text-slate-400">@{profile.username}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 w-full rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:px-6">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            Menu
          </button>
          <div className="hidden lg:block">
            <p className="text-sm text-slate-400">Casino Control Center</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{profile.name}</p>
            <p className="text-xs text-amber-400/90">{profile.roleLabel}</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
