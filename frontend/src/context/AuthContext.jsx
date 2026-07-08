import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  fetchAuthSession,
  loginUser as loginUserRequest,
  logoutUser as logoutUserRequest,
  setAuthToken,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionProfile, setSessionProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const result = await fetchAuthSession();
      if (cancelled) return;

      if (result.ok) {
        setAuthToken(result.token);
        setSessionProfile(result.profile);
        setIsAuthenticated(true);
      } else {
        setSessionProfile(null);
        setIsAuthenticated(false);
      }

      setIsInitializing(false);
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ username, password }) => {
    const result = await loginUserRequest({ username, password });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    setAuthToken(result.token);
    setSessionProfile(result.profile);
    setIsAuthenticated(true);
    return { ok: true, profile: result.profile };
  }, []);

  const logout = useCallback(async () => {
    await logoutUserRequest();
    setSessionProfile(null);
    setIsAuthenticated(false);
    return { ok: true };
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    isInitializing,
    sessionProfile,
    login,
    logout,
  }), [isAuthenticated, isInitializing, sessionProfile, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
