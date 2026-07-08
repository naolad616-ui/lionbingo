import { SelectCardGridIcon } from './BingoIcons';

export default function BingoSubHeader() {
  return (
    <div className="bingo-select-header">
      <div className="bingo-select-header-title">
        <SelectCardGridIcon className="bingo-select-header-icon" />
        <h2 className="bingo-select-header-text">Select Card</h2>
      </div>
    </div>
  );
}
