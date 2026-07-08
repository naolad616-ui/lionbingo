import { useEffect, useState } from 'react';
import { fetchAdminSettings, changeAdminPassword } from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Link } from 'react-router-dom';

export default function AdminSettings() {
  const { profile, expiresAt, hasPermission, logout } = useAdminAuth();
  const [settings, setSettings] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const result = await fetchAdminSettings();
      if (result.ok) {
        setSettings(result.data);
      }
    })();
  }, []);

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const result = await changeAdminPassword({ currentPassword, newPassword });
    if (!result.ok) {
      setError(result.error || 'Failed to change password.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('Password updated. Please log in again.');
    window.setTimeout(() => {
      void logout();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Admin panel preferences and account security.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="admin-card rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white">Account</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>Name: {profile?.name}</p>
            <p>Username: {profile?.username}</p>
            <p>Role: {profile?.roleLabel}</p>
            <p>Session expires: {expiresAt ? new Date(expiresAt).toLocaleString() : '—'}</p>
            <p>Session TTL: {settings?.sessionTtlHours ?? 8} hours</p>
          </div>
        </div>

        <div className="admin-card rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white">Quick Links</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {hasPermission('commission') ? (
              <Link className="text-amber-300 hover:underline" to="/admin/commission">
                Commission Management
              </Link>
            ) : null}
            {hasPermission('reports') ? (
              <Link className="text-amber-300 hover:underline" to="/admin/reports">
                Reports & Exports
              </Link>
            ) : null}
            {hasPermission('security') ? (
              <Link className="text-amber-300 hover:underline" to="/admin/security">
                Security & Login History
              </Link>
            ) : null}
            <Link className="text-amber-300 hover:underline" to="/">
              Back to Host App
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="admin-card max-w-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white">Change Password</h3>
        <label className="mt-4 block text-xs text-slate-400">
          Current Password
          <input
            type="password"
            className="admin-input mt-1 w-full"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label className="mt-3 block text-xs text-slate-400">
          New Password
          <input
            type="password"
            className="admin-input mt-1 w-full"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>
        <label className="mt-3 block text-xs text-slate-400">
          Confirm New Password
          <input
            type="password"
            className="admin-input mt-1 w-full"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
        <button type="submit" className="admin-btn-primary mt-5">
          Update Password
        </button>
      </form>
    </div>
  );
}
