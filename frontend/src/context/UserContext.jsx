import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  changeUserPassword,
  fetchUserProfile,
  resolveAssetUrl,
  updateUserProfile,
  uploadUserAvatar,
} from '../services/api';
import { useAuth } from './AuthContext';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { isAuthenticated, isInitializing, sessionProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshProfile = useCallback(async () => {
    const result = await fetchUserProfile();
    if (result.ok) {
      setProfile(result.profile);
      setError('');
      return result.profile;
    }

    setError(result.error || 'Failed to load profile.');
    return null;
  }, []);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!isAuthenticated) {
      setProfile(null);
      setError('');
      setLoading(false);
      return;
    }

    if (sessionProfile) {
      setProfile(sessionProfile);
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const result = await fetchUserProfile();
      if (cancelled) return;

      if (result.ok) {
        setProfile(result.profile);
        setError('');
      } else {
        setError(result.error || 'Failed to load profile.');
      }

      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitializing, sessionProfile]);

  const saveProfile = useCallback(async ({ name, username }) => {
    const result = await updateUserProfile({ name, username });
    if (result.ok) {
      setProfile(result.profile);
      setError('');
      return { ok: true, profile: result.profile };
    }

    return { ok: false, error: result.error || 'Failed to update profile.' };
  }, []);

  const saveAvatar = useCallback(async (file) => {
    const result = await uploadUserAvatar(file);
    if (result.ok) {
      setProfile(result.profile);
      setError('');
      return { ok: true, profile: result.profile };
    }

    return { ok: false, error: result.error || 'Failed to upload profile photo.' };
  }, []);

  const savePassword = useCallback(async ({ oldPassword, newPassword, confirmPassword }) => {
    const result = await changeUserPassword({ oldPassword, newPassword, confirmPassword });
    if (result.ok) {
      await refreshProfile();
      return { ok: true, message: result.message };
    }

    return { ok: false, error: result.error || 'Failed to change password.' };
  }, [refreshProfile]);

  const value = useMemo(() => {
    const avatarUrl = resolveAssetUrl(profile?.avatarPath);

    return {
      profile,
      loading,
      error,
      displayName: profile?.name || 'Abraham',
      username: profile?.username || 'Abraham5',
      avatarUrl,
      passwordIsSet: Boolean(profile?.passwordIsSet),
      refreshProfile,
      saveProfile,
      saveAvatar,
      savePassword,
    };
  }, [profile, loading, error, refreshProfile, saveProfile, saveAvatar, savePassword]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}
