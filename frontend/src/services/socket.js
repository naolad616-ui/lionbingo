import { io } from 'socket.io-client';
import {
  getSocketLatencySnapshot,
  noteSocketEventOnActiveTraces,
  updateSocketLatencyFlags,
} from '../utils/latencyTrace';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

let socket = null;
let listenersAttached = false;

function attachLatencyListeners(instance) {
  if (listenersAttached) return;
  listenersAttached = true;

  instance.on('connect', () => {
    updateSocketLatencyFlags({
      connected: true,
      reconnecting: false,
      lastConnectAt: Date.now(),
      socketId: instance.id,
    });
    console.log('[latency-trace]', JSON.stringify({
      side: 'frontend',
      stage: 'socket_connect',
      socketId: instance.id,
      snapshot: getSocketLatencySnapshot(instance),
    }));
  });

  instance.on('disconnect', (reason) => {
    updateSocketLatencyFlags({
      connected: false,
      lastDisconnectAt: Date.now(),
      socketId: instance.id,
    });
    console.log('[latency-trace]', JSON.stringify({
      side: 'frontend',
      stage: 'socket_disconnect',
      reason,
      snapshot: getSocketLatencySnapshot(instance),
    }));
  });

  instance.io.on('reconnect_attempt', (attempt) => {
    updateSocketLatencyFlags({
      reconnecting: true,
      lastReconnectAttemptAt: Date.now(),
    });
    console.log('[latency-trace]', JSON.stringify({
      side: 'frontend',
      stage: 'socket_reconnect_attempt',
      attempt,
      snapshot: getSocketLatencySnapshot(instance),
    }));
  });

  instance.io.on('reconnect', (attempt) => {
    updateSocketLatencyFlags({
      connected: true,
      reconnecting: false,
      lastConnectAt: Date.now(),
      socketId: instance.id,
    });
    console.log('[latency-trace]', JSON.stringify({
      side: 'frontend',
      stage: 'socket_reconnect',
      attempt,
      snapshot: getSocketLatencySnapshot(instance),
    }));
  });

  instance.io.on('reconnect_error', (error) => {
    updateSocketLatencyFlags({ reconnecting: true });
    console.log('[latency-trace]', JSON.stringify({
      side: 'frontend',
      stage: 'socket_reconnect_error',
      message: error?.message ?? String(error),
      snapshot: getSocketLatencySnapshot(instance),
    }));
  });

  // Observe key game events for correlation with active Start/Check traces.
  for (const eventName of ['game:state', 'ball:called', 'settings:updated', 'game:prize-locked']) {
    instance.on(eventName, () => {
      noteSocketEventOnActiveTraces(eventName, {
        socketSnapshot: getSocketLatencySnapshot(instance),
      });
    });
  }
}

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
    });
    attachLatencyListeners(socket);
  }
  return socket;
}

export function logSocketEmit(eventName, payloadSummary = {}) {
  const instance = getSocket();
  console.log('[latency-trace]', JSON.stringify({
    side: 'frontend',
    stage: `socket_emit:${eventName}`,
    snapshot: getSocketLatencySnapshot(instance),
    ...payloadSummary,
  }));
}

export default getSocket;
