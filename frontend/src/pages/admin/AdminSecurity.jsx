import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { changeAdminPassword, fetchAdminLoginHistory } from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminSecurity() {
  const { logout, profile, expiresAt, hasPermission } = useAdminAuth();
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasPermission('security')) return;

    void (async () => {
      const result = await fetchAdminLoginHistory(100);
      if (result.ok) {
        setHistory(result.history);
        setHistoryError('');
      } else {
        setHistoryError(result.error || 'Unable to load login history.');
      }
    })();
  }, [hasPermission]);

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
        <h2 className="text-2xl font-bold text-white">Security</h2>
        <p className="mt-1 text-sm text-slate-400">
          Password management, session controls, and login activity.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleChangePassword} className="admin-card rounded-2xl border border-white/10 p-6">
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

        <div className="admin-card rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white">Session Management</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Logged in as:</span>{' '}
              {profile?.name} (@{profile?.username})
            </p>
            <p>
              <span className="text-slate-500">Role:</span> {profile?.roleLabel}
            </p>
            <p>
              <span className="text-slate-500">Session expires:</span>{' '}
              {expiresAt ? new Date(expiresAt).toLocaleString() : '—'}
            </p>
            <p className="text-xs text-slate-500">
              Admin sessions expire automatically after 8 hours for security.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              Logout Now
            </button>
            {hasPermission('admin_management') ? (
              <Link to="/admin/admins" className="admin-btn-secondary">
                Manage Admins
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden rounded-2xl border border-white/10">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold text-white">Login History</h3>
        </div>
        {historyError ? (
          <p className="p-4 text-sm text-rose-400">{historyError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Username</th>
                  <th>Action</th>
                  <th>IP</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{row.createdAt}</td>
                    <td>{row.username}</td>
                    <td>{row.action}</td>
                    <td>{row.ipAddress || '—'}</td>
                    <td className={row.success ? 'text-emerald-400' : 'text-rose-400'}>
                      {row.success ? 'Success' : 'Failed'}
                    </td>
                    <td>{row.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
