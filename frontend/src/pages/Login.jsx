import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginLionMark, { EnvelopeIcon, LockIcon } from '../components/auth/LoginLionMark';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitializing, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from || '/';

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate, redirectTo]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ececec]">
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setSubmitting(true);
    const result = await login({ username: username.trim(), password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ececec] px-4 py-10">
      <div className="grid w-full max-w-[920px] grid-cols-1 items-center gap-8 md:grid-cols-[minmax(220px,1fr)_minmax(0,1.1fr)] md:gap-10">
        <div className="flex justify-center md:justify-end">
          <LoginLionMark />
        </div>

        <div className="mx-auto w-full max-w-[420px] md:mx-0">
          <h1 className="text-[2rem] font-bold uppercase tracking-[0.04em] text-gray-900 sm:text-[2.35rem]">
            Lion Bingo
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-800 sm:text-[15px]">
            Welcome back! Log in to your account to do today&apos;s activities:
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-label="Login form">
            <label className="block">
              <span className="sr-only">Username</span>
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-gray-500">
                  <EnvelopeIcon />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Username"
                  className="w-full rounded-sm border border-transparent bg-[#dbe8f3] px-10 py-3 text-sm text-gray-900 outline-none transition focus:border-lion-settings-accent focus:ring-2 focus:ring-lion-settings-accent/30"
                />
              </span>
            </label>

            <label className="block">
              <span className="sr-only">Password</span>
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-gray-500">
                  <LockIcon />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Password"
                  className="w-full rounded-sm border border-transparent bg-[#dbe8f3] px-10 py-3 text-sm text-gray-900 outline-none transition focus:border-lion-settings-accent focus:ring-2 focus:ring-lion-settings-accent/30"
                />
              </span>
            </label>

            {error ? (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-sm bg-lion-profile-coral px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Logging in...' : 'Log in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
