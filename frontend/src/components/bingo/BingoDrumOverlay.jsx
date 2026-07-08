import { useMemo } from 'react';

const BALL_COUNT = 56;
const SCRAMBLE_VARIANTS = 8;

function createDrumBalls() {
  const numbers = Array.from({ length: 75 }, (_, index) => index + 1);

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
  }

  return numbers.slice(0, BALL_COUNT).map((number, index) => ({
    id: `${number}-${index}`,
    number,
    left: 6 + Math.random() * 78,
    top: 6 + Math.random() * 78,
    size: (22 + Math.random() * 16) * 1.5,
    zIndex: Math.floor(Math.random() * 10) + 1,
    variant: index % SCRAMBLE_VARIANTS,
    duration: (0.85 + Math.random() * 1.35) / 3,
    delay: (Math.random() * 1.8) / 3,
  }));
}

export default function BingoDrumOverlay({ active = false, sessionKey = 0 }) {
  const balls = useMemo(() => createDrumBalls(), [sessionKey]);

  return (
    <div
      className={`bingo-drum-overlay${active ? ' bingo-drum-overlay--active' : ''}`}
      aria-hidden={!active}
    >
      <div className="bingo-drum">
        <div className="bingo-drum-inner">
          {balls.map((ball) => (
            <span
              key={ball.id}
              className={`bingo-drum-ball bingo-drum-ball--scramble-${ball.variant}`}
              style={{
                left: `${ball.left}%`,
                top: `${ball.top}%`,
                width: `${ball.size}px`,
                height: `${ball.size}px`,
                zIndex: ball.zIndex,
                animationDuration: `${ball.duration}s`,
                animationDelay: `${ball.delay}s`,
              }}
            >
              {ball.number}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
