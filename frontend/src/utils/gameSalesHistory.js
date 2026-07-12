import { apiFetch } from '../services/api';
import { calculateSalesBreakdown } from './salesCalculations';

const PERSISTED_SESSIONS_KEY = 'lionbingo-persisted-sales-session-ids';

function loadPersistedSessionIds() {
  try {
    const raw = localStorage.getItem(PERSISTED_SESSIONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function savePersistedSessionIds(ids) {
  localStorage.setItem(PERSISTED_SESSIONS_KEY, JSON.stringify([...ids]));
}

export function markSessionPersisted(sessionId) {
  if (!sessionId) return;
  const ids = loadPersistedSessionIds();
  ids.add(sessionId);
  savePersistedSessionIds(ids);
}

export function isSessionPersisted(sessionId) {
  return loadPersistedSessionIds().has(sessionId);
}

export function buildHistoryRecordFromSession(session, {
  completionReason = 'reset',
  finalWinningNumber = null,
  operatorName = null,
} = {}, tiers = []) {
  if (!session?.id) return null;

  const breakdown = calculateSalesBreakdown(session, tiers);
  const endedAt = session.endedAt || new Date().toISOString();
  const isWinner = completionReason === 'winner' || session.status === 'completed';

  // Commission must always be house commission only — never total collected sales.
  let commission = Number(
    session.prizeSnapshot?.houseCommission
      ?? (Number(session.houseProfit) > 0 ? session.houseProfit : null)
      ?? breakdown.commission,
  );
  let winnerPayout = breakdown.winnerPrize;

  if (session.status === 'reset' || completionReason === 'reset') {
    winnerPayout = 0;
  } else if (isWinner && Number(session.houseProfit) > 0) {
    commission = Number(session.houseProfit);
    winnerPayout = Number(session.winnerPayout || breakdown.winnerPrize);
  }

  const resolvedFinalNumber = finalWinningNumber ?? session.finalWinningNumber ?? null;

  return {
    sessionId: session.id,
    roomId: session.roomId || 'default',
    gameStartedAt: session.startedAt,
    gameEndedAt: endedAt,
    finalWinningNumber: resolvedFinalNumber,
    cardsSold: Number(session.cardsSold || 0),
    betAmount: Number(session.betAmount || 0),
    totalCollected: breakdown.totalSales,
    commission,
    winnerPayout,
    cartelaNumber: session.cartelaNumber ?? null,
    matchedPattern: session.matchedPattern ?? null,
    calledCount: Number(session.calledCount || 0),
    completionReason: isWinner ? 'winner' : 'reset',
    operatorName,
  };
}

export async function persistGameSalesRecord(record) {
  if (!record?.sessionId) {
    return { ok: false, error: 'Missing sessionId' };
  }

  if (isSessionPersisted(record.sessionId)) {
    return { ok: true, skipped: true };
  }

  try {
    const response = await apiFetch('/api/sales/history', {
      method: 'POST',
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: body.error || 'Failed to persist sales history' };
    }

    markSessionPersisted(record.sessionId);
    return { ok: true, ...(await response.json()) };
  } catch (error) {
    return { ok: false, error: error.message || 'Failed to persist sales history' };
  }
}

export async function fetchSalesHistory({ period = 'all', date = null } = {}) {
  const params = new URLSearchParams();
  params.set('period', period);
  if (date) {
    params.set('date', date);
  }

  try {
    const response = await apiFetch(`/api/sales/history?${params.toString()}`);

    if (!response.ok) {
      return { ok: false, records: [], total: 0 };
    }

    const data = await response.json();
    return {
      ok: true,
      period: data.period ?? period,
      date: data.date ?? date,
      records: Array.isArray(data.records) ? data.records : [],
      total: Number(data.total ?? 0),
    };
  } catch {
    return { ok: false, records: [], total: 0 };
  }
}

export async function migrateLocalSessionsToBackend(sessions, tiers = [], operatorName = null) {
  const completedSessions = sessions.filter((session) =>
    ['completed', 'reset'].includes(session.status),
  );

  const results = await Promise.all(
    completedSessions.map(async (session) => {
      if (isSessionPersisted(session.id)) {
        return { sessionId: session.id, skipped: true };
      }

      const record = buildHistoryRecordFromSession(
        session,
        { completionReason: session.status === 'completed' ? 'winner' : 'reset' },
        tiers,
      );

      if (!record) {
        return { sessionId: session.id, skipped: true };
      }

      if (operatorName) {
        record.operatorName = operatorName;
      }

      return persistGameSalesRecord(record);
    }),
  );

  return results;
}

export function historyRecordToSession(record) {
  if (!record) return null;

  const isWinner = record.completionReason === 'winner';

  return {
    id: record.sessionId,
    date: String(record.gameEndedAt || '').slice(0, 10),
    status: isWinner ? 'completed' : 'reset',
    startedAt: record.gameStartedAt,
    endedAt: record.gameEndedAt,
    betAmount: record.betAmount,
    cardsSold: record.cardsSold,
    totalSales: record.totalCollected,
    winnerPayout: record.winnerPayout,
    houseProfit: record.commission,
    cartelaNumber: record.cartelaNumber,
    matchedPattern: record.matchedPattern,
    calledCount: record.calledCount,
    finalWinningNumber: record.finalWinningNumber,
    prizeSnapshot: {
      source: 'backend',
      totalSales: record.totalCollected,
      houseCommission: record.commission,
      prizePool: record.winnerPayout,
      commissionRate: null,
    },
  };
}
