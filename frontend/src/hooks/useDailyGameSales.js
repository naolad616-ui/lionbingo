import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCommissionTiers, fetchGameState } from '../services/api';
import {
  GAME_SALES_UPDATE_EVENT,
  getGameSessionsForDate,
  syncGameSalesFromState,
} from '../utils/gameSalesTracking';
import {
  computeSalesPageSummary,
  getDefaultCommissionTiers,
} from '../utils/salesCalculations';
import { useUser } from '../context/UserContext';

function getTodayDateString() {
  return new Date().toLocaleDateString('en-CA');
}

export default function useDailyGameSales(date = getTodayDateString()) {
  const { displayName } = useUser();
  const [commissionTiers, setCommissionTiers] = useState(getDefaultCommissionTiers);
  const [revision, setRevision] = useState(0);

  const refreshStats = useCallback(async () => {
    const [gameState, commissionResult] = await Promise.all([
      fetchGameState(),
      fetchCommissionTiers(),
    ]);

    if (gameState.ok && gameState.data) {
      syncGameSalesFromState(gameState.data);
    }

    if (commissionResult.ok && commissionResult.tiers?.length) {
      setCommissionTiers(commissionResult.tiers);
    }

    setRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    refreshStats();

    const handleUpdate = () => {
      setRevision((current) => current + 1);
    };

    const pollId = window.setInterval(refreshStats, 5000);
    window.addEventListener(GAME_SALES_UPDATE_EVENT, handleUpdate);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener(GAME_SALES_UPDATE_EVENT, handleUpdate);
    };
  }, [date, refreshStats]);

  const salesData = useMemo(() => {
    const sessions = getGameSessionsForDate(date);
    console.log('[sales-trace] useDailyGameSales recompute', {
      date,
      sessionCount: sessions.length,
      commissionTierCount: commissionTiers.length,
      sessions: sessions.map((session) => ({
        id: session.id,
        status: session.status,
        cardsSold: session.cardsSold,
        totalSales: session.totalSales,
        hasPrizeSnapshot: Boolean(session.prizeSnapshot),
        houseProfit: session.houseProfit,
        winnerPayout: session.winnerPayout,
      })),
    });
    return computeSalesPageSummary(sessions, commissionTiers, displayName);
  }, [commissionTiers, date, revision, displayName]);

  return {
    ...salesData,
    refreshStats,
  };
}
