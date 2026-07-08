import {
  getCellDisplayValue,
  isCardCellMarked,
  isWinningCell,
} from '../../utils/checkCard';

const GRID_SIZE = 5;

export default function CheckCardPreview({
  numbers = null,
  calledNumbers = [],
  cardLoaded = false,
  isPurchased = false,
  winningCells = [],
}) {
  return (
    <div className="check-card-preview">
      <div className="check-card-preview-header" aria-hidden="true">
        {['B', 'I', 'N', 'G', 'O'].map((letter) => (
          <span key={letter} className="check-card-preview-letter">
            {letter}
          </span>
        ))}
      </div>
      <div className="check-card-preview-grid">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const row = Math.floor(index / GRID_SIZE);
          const col = index % GRID_SIZE;
          const value = numbers?.[row]?.[col];
          const isFree = row === 2 && col === 2;
          const isWinner = isWinningCell(row, col, winningCells);
          const isMarked = isCardCellMarked({
            row,
            col,
            value,
            calledNumbers,
            cardLoaded,
            isPurchased,
          });
          const displayValue = getCellDisplayValue({
            row,
            col,
            value,
            cardLoaded,
          });

          return (
            <div
              key={`${row}-${col}`}
              className={[
                'check-card-preview-cell',
                isWinner ? 'check-card-preview-cell--winner' : '',
                !isWinner && isMarked ? 'check-card-preview-cell--marked' : '',
                isFree ? 'check-card-preview-cell--free' : '',
              ].filter(Boolean).join(' ')}
            >
              <span>{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
