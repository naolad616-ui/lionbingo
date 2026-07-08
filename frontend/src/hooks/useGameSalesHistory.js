import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCommissionTiers } from '../services/api';
import {
  fetchSalesHistory,
  migrateLocalSessionsToBackend,
} from '../utils/gameSalesHistory';
import {
  GAME_SALES_UPDATE_EVENT,
  loadSessionsForMigration,
} from '../utils/gameSalesTracking';
import {
  computeSalesPageSummaryFromHistory,
  getDefaultCommissionTiers,
} from '../utils/salesCalculations';
import { useUser } from '../context/UserContext';

function getTodayDateString() {
  return new Date().toLocaleDateString('en-CA');
}

function areHistoryRecordsEqual(left, right) {
  if (left === right) {
    return true;
  }

  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((record, index) => {
    const other = right[index];
    return (
      record.sessionId === other.sessionId
      && record.gameStartedAt === other.gameStartedAt
      && record.gameEndedAt === other.gameEndedAt
      && record.totalCollected === other.totalCollected
      && record.commission === other.commission
      && record.winnerPayout === other.winnerPayout
      && record.calledCount === other.calledCount
      && record.finalWinningNumber === other.finalWinningNumber
      && record.completionReason === other.completionReason
    );
  });
}

function areTiersEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function useGameSalesHistory({
  period = 'day',
  date = getTodayDateString(),
} = {}) {
  const { displayName } = useUser();
  const [commissionTiers, setCommissionTiers] = useState(getDefaultCommissionTiers);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const commissionTiersRef = useRef(commissionTiers);
  const hasLoadedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const migrateInFlightRef = useRef(false);
  const updateTimerRef = useRef(null);
  const displayNameRef = useRef(displayName);
  const periodRef = useRef(period);
  const dateRef = useRef(date);

  displayNameRef.current = displayName;
  periodRef.current = period;
  dateRef.current = date;
  commissionTiersRef.current = commissionTiers;

  const loadHistory = useCallback(async ({ showLoading = false } = {}) => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    const shouldShowLoading = showLoading || !hasLoadedRef.current;

    if (shouldShowLoading) {
      setLoading(true);
    }

    try {
      const activePeriod = periodRef.current;
      const activeDate = dateRef.current;
      const historyDate = activePeriod === 'all' ? null : activeDate;

      const [commissionResult, historyResult] = await Promise.all([
        fetchCommissionTiers(),
        fetchSalesHistory({ period: activePeriod, date: historyDate }),
      ]);

      if (commissionResult.ok && commissionResult.tiers?.length) {
        const nextTiers = commissionResult.tiers;
        if (!areTiersEqual(commissionTiersRef.current, nextTiers)) {
          commissionTiersRef.current = nextTiers;
          setCommissionTiers(nextTiers);
        }
      }

      const nextRecords = historyResult.ok ? historyResult.records : [];
      setHistoryRecords((current) => (
        areHistoryRecordsEqual(current, nextRecords) ? current : nextRecords
      ));
      hasLoadedRef.current = true;
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const runMigration = useCallback(async () => {
    if (migrateInFlightRef.current) {
      return false;
    }

    migrateInFlightRef.current = true;

    try {
      const results = await migrateLocalSessionsToBackend(
        loadSessionsForMigration(),
        commissionTiersRef.current,
        displayNameRef.current,
      );

      return results.some((result) => result?.ok && !result?.skipped);
    } finally {
      migrateInFlightRef.current = false;
    }
  }, []);

  const refreshAfterUpdate = useCallback(async () => {
    await runMigration();
    await loadHistory({ showLoading: false });
  }, [loadHistory, runMigration]);

  const scheduleRefreshAfterUpdate = useCallback(() => {
    if (updateTimerRef.current) {
      window.clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = window.setTimeout(() => {
      updateTimerRef.current = null;
      void refreshAfterUpdate();
    }, 400);
  }, [refreshAfterUpdate]);

  useEffect(() => {
    hasLoadedRef.current = false;
    void (async () => {
      await runMigration();
      await loadHistory({ showLoading: true });
    })();
  }, [period, date, loadHistory, runMigration]);

  useEffect(() => {
    const handleUpdate = () => {
      scheduleRefreshAfterUpdate();
    };

    const pollId = window.setInterval(() => {
      void loadHistory({ showLoading: false });
    }, 5000);

    window.addEventListener(GAME_SALES_UPDATE_EVENT, handleUpdate);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener(GAME_SALES_UPDATE_EVENT, handleUpdate);
      if (updateTimerRef.current) {
        window.clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [loadHistory, scheduleRefreshAfterUpdate]);

  const salesData = useMemo(
    () => computeSalesPageSummaryFromHistory(historyRecords, displayName),
    [historyRecords, displayName],
  );

  return {
    ...salesData,
    loading,
    period,
    date,
    refreshStats: () => loadHistory({ showLoading: !hasLoadedRef.current }),
  };
}
