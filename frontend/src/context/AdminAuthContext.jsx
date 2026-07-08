import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  adminLogin,
  adminLogout,
  clearAdminToken,
  fetchAdminSession,
  getAdminToken,
} from '../services/adminApi';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextProfile, nextExpiresAt) => {
    setProfile(nextProfile);
    setExpiresAt(nextExpiresAt || null);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      applySession(null, null);
      setLoading(false);
      return { ok: false };
    }

    const result = await fetchAdminSession();
    if (!result.ok) {
      clearAdminToken();
      applySession(null, null);
      setLoading(false);
      return result;
    }

    applySession(result.profile, result.expiresAt);
    setLoading(false);
    return result;
  }, [applySession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!expiresAt) return undefined;

    const expiresMs = new Date(expiresAt).getTime() - Date.now();
    if (!Number.isFinite(expiresMs)) return undefined;

    if (expiresMs <= 0) {
      clearAdminToken();
      applySession(null, null);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      clearAdminToken();
      applySession(null, null);
    }, Math.min(expiresMs, 2147483647));

    return () => window.clearTimeout(timer);
  }, [applySession, expiresAt]);

  const login = useCallback(async ({ username, password }) => {
    const result = await adminLogin({ username, password });
    if (!result.ok) {
      return result;
    }

    applySession(result.profile, result.expiresAt);
    return result;
  }, [applySession]);

  const logout = useCallback(async () => {
    await adminLogout();
    applySession(null, null);
  }, [applySession]);

  const hasPermission = useCallback((permission) => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return Array.isArray(profile.permissions) && profile.permissions.includes(permission);
  }, [profile]);

  const value = useMemo(() => ({
    profile,
    expiresAt,
    loading,
    isAuthenticated: Boolean(profile),
    login,
    logout,
    refreshSession,
    hasPermission,
  }), [profile, expiresAt, loading, login, logout, refreshSession, hasPermission]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
