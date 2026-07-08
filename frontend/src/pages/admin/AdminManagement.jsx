import { useEffect, useState } from 'react';
import {
  createAdmin,
  fetchAdmins,
  updateAdmin,
} from '../../services/adminApi';

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'admin',
    permissions: [],
  });

  const reload = async () => {
    const result = await fetchAdmins();
    if (!result.ok) {
      setError(result.error || 'Failed to load admins.');
      return;
    }
    setAdmins(result.admins);
    setRoles(result.roles);
    setPermissions(result.permissions);
  };

  useEffect(() => {
    void reload();
  }, []);

  const togglePermission = (permission) => {
    setForm((current) => {
      const exists = current.permissions.includes(permission);
      return {
        ...current,
        permissions: exists
          ? current.permissions.filter((item) => item !== permission)
          : [...current.permissions, permission],
      };
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const result = await createAdmin(form);
    if (!result.ok) {
      setError(result.error || 'Failed to create admin.');
      return;
    }

    setMessage(`Admin ${result.admin.username} created.`);
    setForm({
      name: '',
      username: '',
      password: '',
      role: 'admin',
      permissions: [],
    });
    await reload();
  };

  const handleToggleActive = async (admin) => {
    const result = await updateAdmin(admin.id, { isActive: !admin.isActive });
    if (!result.ok) {
      setError(result.error || 'Failed to update admin.');
      return;
    }
    await reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Admin Management</h2>
        <p className="mt-1 text-sm text-slate-400">
          Create admins and assign Super Admin, Manager, or Admin roles.
        </p>
      </div>

      <form onSubmit={handleCreate} className="admin-card max-w-2xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white">Create Admin</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Name
            <input
              className="admin-input mt-1 w-full"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <label className="text-xs text-slate-400">
            Username
            <input
              className="admin-input mt-1 w-full"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>
          <label className="text-xs text-slate-400">
            Password
            <input
              type="password"
              className="admin-input mt-1 w-full"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
              minLength={6}
            />
          </label>
          <label className="text-xs text-slate-400">
            Role
            <select
              className="admin-input mt-1 w-full"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
          </label>
        </div>

        {form.role === 'admin' ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Permissions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                  />
                  {permission}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}

        <button type="submit" className="admin-btn-primary mt-5">
          Create Admin
        </button>
      </form>

      <div className="admin-card overflow-hidden rounded-2xl border border-white/10">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold text-white">Existing Admins</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table min-w-full text-left text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name}</td>
                  <td>{admin.username}</td>
                  <td>{admin.roleLabel}</td>
                  <td className="max-w-xs truncate">{admin.permissions.join(', ')}</td>
                  <td className={admin.isActive ? 'text-emerald-400' : 'text-rose-400'}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-secondary px-3 py-1 text-xs"
                      onClick={() => void handleToggleActive(admin)}
                    >
                      {admin.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
