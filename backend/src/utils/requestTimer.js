/**
 * High-resolution timing helpers for Check Cartela profiling.
 * Logs are prefixed with [check-cartela-profile] for Railway log filtering.
 */
export function createRequestTimer(label = 'request') {
  const startedAt = process.hrtime.bigint();
  const marks = new Map();

  return {
    mark(name) {
      marks.set(name, process.hrtime.bigint());
    },
    msSinceStart(name) {
      const at = marks.get(name) ?? process.hrtime.bigint();
      return Number(at - startedAt) / 1e6;
    },
    msBetween(startName, endName) {
      const start = marks.get(startName);
      const end = marks.get(endName) ?? process.hrtime.bigint();
      if (start === undefined) return null;
      return Number(end - start) / 1e6;
    },
    totalMs() {
      return Number(process.hrtime.bigint() - startedAt) / 1e6;
    },
    log(extra = {}) {
      const payload = {
        label,
        totalMs: Number(this.totalMs().toFixed(2)),
        ...extra,
      };
      console.log('[check-cartela-profile]', JSON.stringify(payload));
      return payload;
    },
  };
}

export function measureSync(fn) {
  const start = process.hrtime.bigint();
  const value = fn();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { value, ms };
}

export async function measureAsync(fn) {
  const start = process.hrtime.bigint();
  const value = await fn();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { value, ms };
}
