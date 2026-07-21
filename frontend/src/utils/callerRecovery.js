import getSocket from '../services/socket';
import { isBrowserOnline, subscribeToNetworkStatus } from './networkStatus';

/**
 * Caller connectivity gate: browser must be online and the Socket.IO session
 * must be connected. Draw progression is frozen whenever this returns false.
 */
export function isCallerConnectionHealthy() {
  if (!isBrowserOnline()) {
    return false;
  }

  return getSocket().connected;
}

/**
 * Subscribe to browser online/offline and Socket.IO connect/disconnect/error.
 * @param {(healthy: boolean) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeToCallerConnectionHealth(listener) {
  const socket = getSocket();

  const notify = () => {
    listener(isCallerConnectionHealthy());
  };

  const unsubNetwork = subscribeToNetworkStatus(() => {
    notify();
  });

  const onConnect = () => {
    notify();
  };

  const onDisconnect = () => {
    notify();
  };

  const onConnectError = () => {
    listener(false);
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onConnectError);

  return () => {
    unsubNetwork();
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('connect_error', onConnectError);
  };
}
