export const DEFAULT_SPEED = 4;
export const DEFAULT_CALL_INTERVAL_MS = 2800;

export function speedToIntervalMs(speedValue) {
  const parsedSpeed = Number.parseFloat(String(speedValue));
  const speed = Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : DEFAULT_SPEED;
  return Math.round((DEFAULT_CALL_INTERVAL_MS * DEFAULT_SPEED) / speed);
}
