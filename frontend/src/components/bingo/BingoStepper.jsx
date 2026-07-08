export default function BingoStepper({
  label,
  value,
  onDecrease,
  onIncrease,
  min = 0,
  max = 999,
  underlineLabel = false,
  tone = 'count',
}) {
  return (
    <div className="bingo-stepper">
      <span
        className={`bingo-stepper-label ${underlineLabel ? 'bingo-stepper-label--underline' : ''}`}
      >
        {label}
      </span>
      <div className="bingo-stepper-controls">
        <button
          type="button"
          onClick={onDecrease}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="bingo-stepper-btn bingo-stepper-btn--minus"
        >
          −
        </button>
        <div className={`bingo-stepper-value bingo-stepper-value--${tone}`}>{value}</div>
        <button
          type="button"
          onClick={onIncrease}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="bingo-stepper-btn bingo-stepper-btn--plus"
        >
          +
        </button>
      </div>
    </div>
  );
}
