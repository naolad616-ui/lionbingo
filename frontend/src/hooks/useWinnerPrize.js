import { useCallback, useEffect, useState } from 'react';
import { configureGameSales, fetchGameState } from '../services/api';
import getSocket from '../services/socket';

function extractPrizePool(state) {
  const prize = state?.prize?.prizePool ?? state?.prizePool ?? 0;
  const parsed = Number(prize);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useWinnerPrize({
  betAmount,
  cardsSold,
  selectedCartelas = [],
  closed,
  syncSales = true,
}) {
  const [winnerPrize, setWinnerPrize] = useState(0);
  const [prizeLocked, setPrizeLocked] = useState(false);

  const applyState = useCallback((state) => {
    const prizePool = extractPrizePool(state);
    console.log('[sales-trace] useWinnerPrize applyState', {
      source: 'backend',
      prizePool,
      prize: state?.prize
        ? {
            totalSales: state.prize.totalSales,
            houseCommission: state.prize.houseCommission,
            prizePool: state.prize.prizePool,
            commissionRate: state.prize.commissionRate,
          }
        : null,
      prizeLocked: Boolean(state?.prizeLocked),
    });
    setWinnerPrize(prizePool);
    setPrizeLocked(Boolean(state?.prizeLocked));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const socket = getSocket();

    const handleState = (state) => {
      applyState(state);
    };

    const setup = async () => {
      if (syncSales) {
        const result = await configureGameSales({
          betAmount,
          cardsSold,
          selectedCartelas,
          closed,
        });
        if (!cancelled && result.ok) {
          applyState(result.state ?? { prize: result.prize });
        }
      } else {
        const result = await fetchGameState();
        if (!cancelled && result.ok && result.data) {
          applyState(result.data);
        }
      }

      if (cancelled) return;

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('join-room', {});
      socket.on('game:state', handleState);
      socket.on('game:configured', ({ state, prize }) => {
        applyState(state ?? { prize });
      });
      socket.on('game:prize-locked', ({ state, prize }) => {
        applyState(state ?? { prize });
      });
    };

    setup();

    return () => {
      cancelled = true;
      socket.off('game:state', handleState);
      socket.off('game:configured');
      socket.off('game:prize-locked');
    };
  }, [betAmount, cardsSold, selectedCartelas, closed, syncSales, applyState]);

  return { winnerPrize, prizeLocked, applyState };
}
