import BingoActionButton from './BingoActionButton';
import BingoStepper from './BingoStepper';

export default function BingoControlBar({
  gameCount,
  betAmount,
  onGameDecrease,
  onGameIncrease,
  onBetDecrease,
  onBetIncrease,
  onEnterCard,
  onSyncPrevious,
  onPlay,
  isFullscreen = false,
  onFullscreen,
}) {
  return (
    <div className="bingo-control-bar">
      <div className="bingo-control-bar-actions">
        <BingoActionButton variant="enter" onClick={onEnterCard}>
          EnterCard
        </BingoActionButton>
        <BingoActionButton onClick={onSyncPrevious}>Sync Previous</BingoActionButton>
        <BingoActionButton>Fetch</BingoActionButton>
      </div>

      <div className="bingo-control-bar-steppers">
        <BingoStepper
          label="ዝግ"
          value={gameCount}
          onDecrease={onGameDecrease}
          onIncrease={onGameIncrease}
          min={1}
        />
        <BingoStepper
          label="BET(BIRR)"
          value={betAmount}
          onDecrease={onBetDecrease}
          onIncrease={onBetIncrease}
          min={10}
          underlineLabel
        />
      </div>

      <div className="bingo-control-bar-right">
        <BingoActionButton variant="play" className="bingo-control-play-btn" onClick={onPlay}>
          Play
        </BingoActionButton>
        <BingoActionButton variant="fullscreen" onClick={onFullscreen}>
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </BingoActionButton>
      </div>
    </div>
  );
}
