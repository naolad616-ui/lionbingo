/** Browser connectivity helpers for in-progress game offline fallback. */

export function isBrowserOnline() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine !== false;
}

/**
 * Subscribe to online/offline changes. Returns an unsubscribe function.
 * @param {(online: boolean) => void} listener
 */
export function subscribeToNetworkStatus(listener) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => listener(true);
  const handleOffline = () => listener(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
