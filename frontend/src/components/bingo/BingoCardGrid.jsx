import BingoCardButton from './BingoCardButton';

const TOTAL_CARDS = 150;

export default function BingoCardGrid({ selectedCards, onToggleCard }) {
  const cards = Array.from({ length: TOTAL_CARDS }, (_, index) => index + 1);

  return (
    <div className="bingo-select-grid-shell">
      <div className="bingo-card-scroll">
        <div className="bingo-card-grid">
          {cards.map((number) => (
            <BingoCardButton
              key={number}
              number={number}
              isSelected={selectedCards.has(number)}
              onClick={() => onToggleCard(number)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
