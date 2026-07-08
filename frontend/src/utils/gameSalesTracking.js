import getSocket from '../services/socket';
import {
  buildHistoryRecordFromSession,
  persistGameSalesRecord,
} from './gameSalesHistory';
import { getDefaultCommissionTiers } from './salesCalculations';

const SESSIONS_STORAGE_KEY = 'lionbingo-game-sales-sessions';
const RECORDED_WINNERS_KEY = 'lionbingo-recorded-winner-ids';
const UPDATE_EVENT = 'game-sales-updated';

function getLocalDateString(date = new Date()) {
  return date.toLocaleDateString('en-CA');
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  const serialized = JSON.stringify(sessions);

  try {
    const existing = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (existing === serialized) {
      return false;
    }

    localStorage.setItem(SESSIONS_STORAGE_KEY, serialized);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    return true;
  } catch {
    return false;
  }
}

function loadRecordedWinnerIds() {
  try {
    const raw = localStorage.getItem(RECORDED_WINNERS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveRecordedWinnerIds(ids) {
  localStorage.setItem(RECORDED_WINNERS_KEY, JSON.stringify([...ids]));
}

function notifyUpdate() {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function normalizeSales(sales = {}) {
  const betAmount = Number(sales.betAmount ?? 0);
  const cardsSold = Number(sales.cardsSold ?? 0);
  const totalSales = Number.isFinite(Number(sales.totalSales))
    ? Number(sales.totalSales)
    : betAmount * cardsSold;

  return {
    betAmount,
    cardsSold,
    totalSales,
    selectedCartelas: Array.isArray(sales.selectedCartelas) ? [...sales.selectedCartelas] : [],
  };
}

function applyBackendPrizeSnapshot(session, prize) {
  if (!session || !prize) {
    console.log('[sales-trace] applyBackendPrizeSnapshot skipped', {
      sessionId: session?.id ?? null,
      hasPrize: Boolean(prize),
    });
    return;
  }

  session.prizeSnapshot = {
    source: 'backend',
    totalSales: Number(prize.totalSales ?? 0),
    houseCommission: Number(prize.houseCommission ?? 0),
    prizePool: Number(prize.prizePool ?? 0),
    commissionRate: Number(prize.commissionRate ?? 0),
  };
  session.totalSales = session.prizeSnapshot.totalSales;
  session.commissionRate = session.prizeSnapshot.commissionRate;

  console.log('[sales-trace] applyBackendPrizeSnapshot', {
    sessionId: session.id,
    status: session.status,
    totalSales: session.prizeSnapshot.totalSales,
    houseCommission: session.prizeSnapshot.houseCommission,
    prizePool: session.prizeSnapshot.prizePool,
    commissionRate: session.prizeSnapshot.commissionRate,
    source: 'backend',
  });
}

function findLatestOpenSession(sessions, date = getLocalDateString()) {
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    const session = sessions[index];
    if (session.date === date && (session.status === 'configuring' || session.status === 'active')) {
      return session;
    }
  }

  return null;
}

function createSession({ status, sales }) {
  const normalized = normalizeSales(sales);

  return {
    id: crypto.randomUUID(),
    date: getLocalDateString(),
    status,
    startedAt: new Date().toISOString(),
    endedAt: null,
    ...normalized,
    winnerPayout: 0,
    houseProfit: 0,
    cartelaNumber: null,
    matchedPattern: null,
    calledCount: 0,
    finalWinningNumber: null,
    roomId: 'default',
  };
}

async function persistCompletedSession(session, options = {}) {
  if (!session || !['completed', 'reset'].includes(session.status)) {
    return;
  }

  const record = buildHistoryRecordFromSession(session, options, getDefaultCommissionTiers());
  if (!record) return;

  const result = await persistGameSalesRecord(record);
  if (!result.ok) {
    console.warn('[sales-history] persist failed', { sessionId: session.id, error: result.error });
  }
}

export function trackCartelaPurchase(sales, prize = null) {
  if (!sales) return;

  const sessions = loadSessions();
  const normalized = normalizeSales(sales);
  const openSession = findLatestOpenSession(sessions);

  if (openSession) {
    Object.assign(openSession, normalized);
    applyBackendPrizeSnapshot(openSession, prize);
  } else {
    const session = createSession({ status: 'configuring', sales: normalized });
    applyBackendPrizeSnapshot(session, prize);
    sessions.push(session);
  }

  saveSessions(sessions);

  console.log('[sales-trace] trackCartelaPurchase', {
    sessionId: openSession?.id ?? sessions[sessions.length - 1]?.id ?? null,
    cardsSold: normalized.cardsSold,
    betAmount: normalized.betAmount,
    totalSales: normalized.totalSales,
    hasPrize: Boolean(prize),
    prize: prize
      ? {
          totalSales: prize.totalSales,
          houseCommission: prize.houseCommission,
          prizePool: prize.prizePool,
          commissionRate: prize.commissionRate,
        }
      : null,
  });
}

export function trackGameStart(sales, prize = null) {
  const sessions = loadSessions();
  const normalized = normalizeSales(sales);
  const openSession = findLatestOpenSession(sessions);

  if (openSession) {
    Object.assign(openSession, normalized, {
      status: 'active',
      startedAt: openSession.startedAt || new Date().toISOString(),
    });
    applyBackendPrizeSnapshot(openSession, prize);
  } else {
    const session = createSession({ status: 'active', sales: normalized });
    applyBackendPrizeSnapshot(session, prize);
    sessions.push(session);
  }

  saveSessions(sessions);

  console.log('[sales-trace] trackGameStart', {
    sessionId: openSession?.id ?? sessions[sessions.length - 1]?.id ?? null,
    status: openSession?.status ?? sessions[sessions.length - 1]?.status ?? null,
    cardsSold: normalized.cardsSold,
    betAmount: normalized.betAmount,
    totalSales: normalized.totalSales,
    hasPrize: Boolean(prize),
    prize: prize
      ? {
          totalSales: prize.totalSales,
          houseCommission: prize.houseCommission,
          prizePool: prize.prizePool,
          commissionRate: prize.commissionRate,
        }
      : null,
  });
}

export function trackGameEnd(reason = 'reset', context = {}) {
  const sessions = loadSessions();
  const activeSession = [...sessions].reverse().find((session) => session.status === 'active');

  if (!activeSession) {
    notifyUpdate();
    return;
  }

  const finalWinningNumber = context.finalWinningNumber ?? context.final_winning_number ?? null;
  const calledCount = context.calledCount ?? context.called_count;

  activeSession.status = reason === 'winner' ? 'completed' : 'reset';
  activeSession.endedAt = new Date().toISOString();

  if (finalWinningNumber != null) {
    activeSession.finalWinningNumber = Number(finalWinningNumber);
  }

  if (Number.isFinite(Number(calledCount))) {
    activeSession.calledCount = Number(calledCount);
  }

  saveSessions(sessions);
  void persistCompletedSession(activeSession, {
    completionReason: reason === 'winner' ? 'winner' : 'reset',
    finalWinningNumber: activeSession.finalWinningNumber,
  });
}

function getWinnerRecordId(settlement) {
  const recordedAt = settlement.recordedAt || settlement.created_at || '';
  const cartelaNumber = settlement.cartelaNumber ?? settlement.cartela_number ?? '';
  const totalPool = settlement.totalPool ?? settlement.total_pool ?? '';
  return `${recordedAt}:${cartelaNumber}:${totalPool}`;
}

export function trackWinnerSettlement(settlement) {
  if (!settlement) return;

  const recordId = getWinnerRecordId(settlement);
  const recordedIds = loadRecordedWinnerIds();
  if (recordedIds.has(recordId)) {
    return;
  }

  recordedIds.add(recordId);
  saveRecordedWinnerIds(recordedIds);

  const sessions = loadSessions();
  const winnerPayout = Number(settlement.winnerPayout ?? settlement.winner_payout ?? 0);
  const houseProfit = Number(settlement.houseProfit ?? settlement.house_profit ?? 0);
  const totalPool = Number(settlement.totalPool ?? settlement.total_pool ?? 0);
  const cardsSold = Number(settlement.cardsSold ?? settlement.cards_sold ?? 0);
  const cartelaNumber = settlement.cartelaNumber ?? settlement.cartela_number ?? null;
  const matchedPattern = settlement.matchedPattern ?? settlement.matched_pattern ?? null;
  const recordedAt = settlement.recordedAt || settlement.created_at || new Date().toISOString();
  const finalWinningNumber = settlement.finalWinningNumber ?? settlement.final_winning_number ?? null;
  const calledCount = settlement.calledCount ?? settlement.called_count;

  let targetSession = [...sessions]
    .reverse()
    .find((session) => session.status === 'active' || session.status === 'configuring');

  if (targetSession) {
    targetSession.status = 'completed';
    targetSession.endedAt = recordedAt;
    targetSession.winnerPayout = winnerPayout;
    targetSession.houseProfit = houseProfit;
    targetSession.totalSales = totalPool || targetSession.totalSales;
    targetSession.cardsSold = cardsSold || targetSession.cardsSold;
    targetSession.cartelaNumber = cartelaNumber;
    targetSession.matchedPattern = matchedPattern;
    if (finalWinningNumber != null) {
      targetSession.finalWinningNumber = Number(finalWinningNumber);
    }
    if (Number.isFinite(Number(calledCount))) {
      targetSession.calledCount = Number(calledCount);
    }
    applyBackendPrizeSnapshot(targetSession, {
      totalSales: totalPool || targetSession.totalSales,
      houseCommission: houseProfit,
      prizePool: winnerPayout,
      commissionRate: settlement.commissionRate ?? targetSession.commissionRate ?? 0,
    });
  } else {
    const session = {
      id: crypto.randomUUID(),
      date: getLocalDateString(new Date(recordedAt)),
      status: 'completed',
      startedAt: recordedAt,
      endedAt: recordedAt,
      betAmount: cardsSold > 0 ? totalPool / cardsSold : 0,
      cardsSold,
      totalSales: totalPool,
      selectedCartelas: cartelaNumber ? [cartelaNumber] : [],
      winnerPayout,
      houseProfit,
      cartelaNumber,
      matchedPattern,
      calledCount: Number.isFinite(Number(calledCount)) ? Number(calledCount) : 0,
      finalWinningNumber: finalWinningNumber != null ? Number(finalWinningNumber) : null,
    };
    applyBackendPrizeSnapshot(session, {
      totalSales: totalPool,
      houseCommission: houseProfit,
      prizePool: winnerPayout,
      commissionRate: settlement.commissionRate ?? 0,
    });
    sessions.push(session);
  }

  saveSessions(sessions);

  const completedSession = targetSession
    ?? sessions[sessions.length - 1];

  void persistCompletedSession(completedSession, {
    completionReason: 'winner',
    finalWinningNumber: completedSession?.finalWinningNumber ?? null,
  });
}

export function recordCheckCardWinner({
  cartelaNumber,
  matchedPattern = null,
  finalWinningNumber = null,
  calledCount = 0,
  prize = null,
}) {
  const sessions = loadSessions();
  const openSession = [...sessions]
    .reverse()
    .find((session) => session.status === 'active' || session.status === 'configuring');

  if (!openSession) {
    return;
  }

  const totalPool = Number(prize?.totalSales ?? openSession.totalSales ?? 0);
  const winnerPayout = Number(prize?.prizePool ?? 0);
  const houseProfit = Number(prize?.houseCommission ?? 0);

  trackWinnerSettlement({
    cartelaNumber,
    matchedPattern,
    finalWinningNumber,
    calledCount,
    totalPool,
    winnerPayout,
    houseProfit,
    cardsSold: prize?.cardsSold ?? openSession.cardsSold,
    commissionRate: prize?.commissionRate ?? openSession.commissionRate ?? 0,
    recordedAt: new Date().toISOString(),
  });
}

export function syncGameSalesFromState(state) {
  const sessions = loadSessions();
  const activeSession = [...sessions]
    .reverse()
    .find((session) => session.status === 'active' || session.status === 'configuring');

  let sessionChanged = false;

  if (activeSession) {
    const previousCalledCount = Number(activeSession.calledCount || 0);
    const previousSnapshot = JSON.stringify(activeSession.prizeSnapshot ?? null);

    if (Array.isArray(state?.calledNumbers)) {
      const nextCalledCount = state.calledNumbers.length;
      if (nextCalledCount !== previousCalledCount) {
        activeSession.calledCount = nextCalledCount;
        sessionChanged = true;
      }
    }

    if (state?.prize) {
      applyBackendPrizeSnapshot(activeSession, state.prize);
      const nextSnapshot = JSON.stringify(activeSession.prizeSnapshot ?? null);
      if (nextSnapshot !== previousSnapshot) {
        sessionChanged = true;
      }
    }

    if (sessionChanged) {
      saveSessions(sessions);
    }
  }

  if (state?.lastWinnerResult) {
    trackWinnerSettlement(state.lastWinnerResult);
  }

  console.log('[sales-trace] syncGameSalesFromState', {
    hasActiveSession: Boolean(activeSession),
    sessionId: activeSession?.id ?? null,
    sessionStatus: activeSession?.status ?? null,
    backendCalledCount: Array.isArray(state?.calledNumbers) ? state.calledNumbers.length : 0,
    backendPrize: state?.prize
      ? {
          totalSales: state.prize.totalSales,
          houseCommission: state.prize.houseCommission,
          prizePool: state.prize.prizePool,
          commissionRate: state.prize.commissionRate,
        }
      : null,
    storedSnapshot: activeSession?.prizeSnapshot ?? null,
    storedHouseProfit: activeSession?.houseProfit ?? null,
    storedWinnerPayout: activeSession?.winnerPayout ?? null,
  });
}

export function getAllGameSessions() {
  return loadSessions()
    .filter((session) => session.status !== 'configuring')
    .sort((left, right) => new Date(left.startedAt) - new Date(right.startedAt));
}

export function loadSessionsForMigration() {
  return loadSessions();
}

export function getGameSessionsForDate(date = getLocalDateString()) {
  return loadSessions()
    .filter((session) => session.date === date && session.status !== 'configuring')
    .sort((left, right) => new Date(left.startedAt) - new Date(right.startedAt));
}

export function mapSessionToTableRow(session, index, operatorName = 'Abraham') {
  const pricePerCard = Number(session.betAmount || 0);
  const numberOfCards = Number(session.cardsSold || 0);
  const collected = Number(session.totalSales || pricePerCard * numberOfCards);

  let commission = 0;
  if (session.status === 'completed') {
    commission = Number(session.houseProfit || 0);
  } else if (session.status === 'reset') {
    commission = collected;
  }

  return {
    id: session.id,
    startedTime: session.startedAt,
    endedTime: session.endedAt || '',
    shopName: `${operatorName}${numberOfCards || index + 1}`,
    onCall: Number(session.calledCount || 0),
    numberOfCards,
    pricePerCard,
    collected,
    commission,
    by: operatorName,
  };
}

export function computeDailyGameStats(date = getLocalDateString()) {
  const sessions = loadSessions().filter((session) => session.date === date);
  const playedSessions = sessions.filter((session) =>
    ['active', 'completed', 'reset'].includes(session.status),
  );

  const gamesPlayed = playedSessions.length;
  const totalBets = playedSessions.reduce(
    (sum, session) => sum + Number(session.totalSales || 0),
    0,
  );
  const totalWins = playedSessions.reduce(
    (sum, session) => sum + Number(session.winnerPayout || 0),
    0,
  );
  const totalProfit = playedSessions.reduce((sum, session) => {
    if (session.status === 'completed' && Number(session.houseProfit) > 0) {
      return sum + Number(session.houseProfit);
    }

    if (session.status === 'reset') {
      return sum + Number(session.totalSales || 0);
    }

    return sum;
  }, 0);
  const totalCartelas = playedSessions.reduce(
    (sum, session) => sum + Number(session.cardsSold || 0),
    0,
  );

  return {
    date,
    gamesPlayed,
    totalBets,
    totalCartelas,
    totalWins,
    totalProfit,
    sessions: playedSessions,
  };
}

export const GAME_SALES_UPDATE_EVENT = UPDATE_EVENT;

let trackingInitialized = false;

export function initGameSalesTracking() {
  if (trackingInitialized || typeof window === 'undefined') {
    return;
  }

  trackingInitialized = true;
  const socket = getSocket();

  const handleGameState = (state) => {
    syncGameSalesFromState(state);
  };

  const handleBingoValidated = (result) => {
    if (result?.settlement) {
      trackWinnerSettlement(result.settlement);
      return;
    }

    if (result?.prize) {
      trackWinnerSettlement({
        cartelaNumber: result.cartelaNumber,
        totalPool: result.prize.totalSales,
        winnerPayout: result.prize.prizePool,
        houseProfit: result.prize.houseCommission,
        cardsSold: result.prize.cardsSold,
        matchedPattern: result.matchedPattern,
        recordedAt: new Date().toISOString(),
      });
    }
  };

  if (!socket.connected) {
    socket.connect();
  }

  socket.on('game:state', handleGameState);
  socket.on('bingo:validated', handleBingoValidated);
}
