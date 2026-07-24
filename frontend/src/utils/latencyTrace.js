/**
 * End-to-end latency instrumentation for Start Game / Check Card.
 * Logs use prefix [latency-trace]. Does not change game logic.
 */

const PREFIX = '[latency-trace]';
const activeTraces = new Map();
let socketFlags = {
  connected: false,
  reconnecting: false,
  lastDisconnectAt: null,
  lastConnectAt: null,
  lastReconnectAttemptAt: null,
  socketId: null,
};

function nowMs() {
  return performance.now();
}

function roundMs(value) {
  return Number(Number(value).toFixed(2));
}

export function updateSocketLatencyFlags(partial) {
  socketFlags = { ...socketFlags, ...partial };
}

export function getSocketLatencySnapshot(socket = null) {
  const connected = Boolean(socket?.connected ?? socketFlags.connected);
  const reconnecting = Boolean(
    socketFlags.reconnecting
    || (socket && !socket.connected && socket.active),
  );

  return {
    connected,
    reconnecting,
    active: Boolean(socket?.active),
    socketId: socket?.id ?? socketFlags.socketId,
    lastDisconnectAt: socketFlags.lastDisconnectAt,
    lastConnectAt: socketFlags.lastConnectAt,
    lastReconnectAttemptAt: socketFlags.lastReconnectAttemptAt,
    msSinceDisconnect: socketFlags.lastDisconnectAt != null
      ? roundMs(Date.now() - socketFlags.lastDisconnectAt)
      : null,
  };
}

export function createLatencyTrace(action, extra = {}) {
  const traceId = `${action}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = nowMs();
  const wallStartedAt = Date.now();
  const marks = [];

  const trace = {
    id: traceId,
    action,
    startedAt,
    wallStartedAt,
    marks,
    finished: false,
    mark(stage, details = {}) {
      const elapsedMs = roundMs(nowMs() - startedAt);
      const entry = {
        stage,
        elapsedMs,
        wallMs: Date.now(),
        ...details,
      };
      marks.push(entry);
      console.log(PREFIX, JSON.stringify({
        side: 'frontend',
        traceId,
        action,
        stage,
        elapsedMs,
        ...details,
      }));
      return entry;
    },
    durationBetween(fromStage, toStage) {
      const from = [...marks].reverse().find((m) => m.stage === fromStage);
      const to = [...marks].reverse().find((m) => m.stage === toStage);
      if (!from || !to) return null;
      return roundMs(to.elapsedMs - from.elapsedMs);
    },
    getHeaders() {
      return {
        'X-Latency-Trace-Id': traceId,
        'X-Latency-Action': action,
      };
    },
    finish(details = {}) {
      if (trace.finished) {
        return null;
      }
      trace.finished = true;

      const totalMs = roundMs(nowMs() - startedAt);
      const stageDurations = [];

      for (let i = 0; i < marks.length; i += 1) {
        const current = marks[i];
        const previousElapsed = i === 0 ? 0 : marks[i - 1].elapsedMs;
        stageDurations.push({
          stage: current.stage,
          sincePreviousMs: roundMs(current.elapsedMs - previousElapsed),
          elapsedMs: current.elapsedMs,
        });
      }

      let bottleneck = null;
      for (const item of stageDurations) {
        if (!bottleneck || item.sincePreviousMs > bottleneck.sincePreviousMs) {
          bottleneck = item;
        }
      }

      const summary = {
        side: 'frontend',
        traceId,
        action,
        stage: 'SUMMARY',
        totalMs,
        stageDurations,
        bottleneck: bottleneck
          ? {
            stage: bottleneck.stage,
            sincePreviousMs: bottleneck.sincePreviousMs,
            note: `Largest gap ended at "${bottleneck.stage}" (${bottleneck.sincePreviousMs}ms since previous mark)`,
          }
          : null,
        ...details,
      };

      console.log(PREFIX, JSON.stringify(summary));
      activeTraces.delete(action);
      return summary;
    },
  };

  activeTraces.set(action, trace);
  console.log(PREFIX, JSON.stringify({
    side: 'frontend',
    traceId,
    action,
    stage: 'trace_created',
    elapsedMs: 0,
    ...extra,
  }));

  return trace;
}

export function getActiveLatencyTrace(action) {
  return activeTraces.get(action) ?? null;
}

export function noteSocketEventOnActiveTraces(eventName, details = {}) {
  for (const trace of activeTraces.values()) {
    trace.mark(`socket_receive:${eventName}`, details);
  }
}
