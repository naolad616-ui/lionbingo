import { memo, useEffect } from 'react';

const VISIBLE_MS = 850;

/**
 * Flash overlay for cartela selection (1–150) only.
 * Pure UI — does not affect selection or game logic.
 */
function CartelaNumberCallout({ number, token, onDone }) {
  useEffect(() => {
    if (number == null || token == null) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onDone?.();
    }, VISIBLE_MS);

    return () => window.clearTimeout(timer);
  }, [number, token, onDone]);

  if (number == null || token == null) {
    return null;
  }

  return (
    <div
      className="cartela-number-callout"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Cartela ${number} selected`}
    >
      <div className="cartela-number-callout-flash" aria-hidden="true" />
      <div className="cartela-number-callout-circle">
        <span className="cartela-number-callout-number">{number}</span>
      </div>
    </div>
  );
}

export default memo(CartelaNumberCallout);
