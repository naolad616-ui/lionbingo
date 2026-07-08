export default function BingoCardButton({ number, isSelected, onClick }) {
  const isTriple = number > 99;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select card ${number}`}
      aria-pressed={isSelected}
      className={`bingo-ball ${isSelected ? 'bingo-ball-selected' : ''} ${isTriple ? 'bingo-ball-triple' : ''}`}
    >
      <span className="bingo-ball-number">{number}</span>
    </button>
  );
}
