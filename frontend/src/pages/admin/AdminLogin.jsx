import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await login({ username, password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Login failed.');
      return;
    }

    navigate('/admin', { replace: true });
  };

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="admin-card w-full max-w-md rounded-2xl border border-amber-500/20 p-8 shadow-2xl"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-amber-400">Secure Access</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to manage commission, reports, and security.
        </p>

        <label className="mt-6 block text-sm text-slate-300">
          Username
          <input
            className="admin-input mt-1.5 w-full"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mt-4 block text-sm text-slate-300">
          Password
          <input
            type="password"
            className="admin-input mt-1.5 w-full"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="admin-btn-primary mt-6 w-full"
        >
          {submitting ? 'Signing in...' : 'Login'}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Default: admin / admin123
        </p>
      </form>
    </div>
  );
}
