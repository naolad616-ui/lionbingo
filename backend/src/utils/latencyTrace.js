/**
 * Backend latency instrumentation for Start Game / Check Card paths.
 * Logs use prefix [latency-trace]. Does not change game logic.
 */

const PREFIX = '[latency-trace]';

function roundMs(value) {
  return Number(Number(value).toFixed(2));
}

export function logLatency(payload) {
  console.log(PREFIX, JSON.stringify({
    side: 'backend',
    wallMs: Date.now(),
    ...payload,
  }));
}

export function readLatencyHeaders(req) {
  const traceId = req.get('X-Latency-Trace-Id') || null;
  const action = req.get('X-Latency-Action') || null;
  return { traceId, action };
}

export function latencyTraceMiddleware(req, res, next) {
  const { traceId, action } = readLatencyHeaders(req);
  if (!traceId) {
    return next();
  }

  const startedAt = process.hrtime.bigint();
  req.latencyTrace = {
    id: traceId,
    action,
    startedAt,
    mark(stage, details = {}) {
      const elapsedMs = roundMs(Number(process.hrtime.bigint() - startedAt) / 1e6);
      logLatency({
        traceId,
        action,
        stage,
        elapsedMs,
        method: req.method,
        path: req.originalUrl,
        ...details,
      });
      return elapsedMs;
    },
  };

  req.latencyTrace.mark('request_reaches_backend');

  res.on('finish', () => {
    const totalMs = roundMs(Number(process.hrtime.bigint() - startedAt) / 1e6);
    logLatency({
      traceId,
      action,
      stage: 'response_sent',
      totalMs,
      statusCode: res.statusCode,
      method: req.method,
      path: req.originalUrl,
    });
  });

  return next();
}

export function markHandler(req, stage, details = {}) {
  if (req?.latencyTrace) {
    return req.latencyTrace.mark(stage, details);
  }

  const { traceId, action } = readLatencyHeaders(req);
  if (!traceId) return null;

  logLatency({
    traceId,
    action,
    stage,
    method: req.method,
    path: req.originalUrl,
    ...details,
  });
  return null;
}
