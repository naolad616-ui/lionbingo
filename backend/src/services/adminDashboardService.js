import { DEFAULT_ROOM_ID } from '../constants/defaults.js';
import { roomManager } from './gameEngine.js';
import { getOnlineCount, getOnlineBreakdown } from './presenceService.js';
import { queryGameSalesHistory } from './salesHistoryService.js';
import db from '../config/database.js';

const TOTAL_CARTELAS = 150;

const selectWinnerHistory = db.prepare(`
  SELECT *
  FROM winner_results
  ORDER BY datetime(created_at) DESC, id DESC
  LIMIT ?
`);

function mapWinnerRow(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    cartelaNumber: row.cartela_number,
    totalPool: row.total_pool,
    winnerPayout: row.winner_payout,
    houseProfit: row.house_profit,
    commissionRate: row.commission_rate,
    commissionTierId: row.commission_tier_id,
    commissionTierLabel: row.commission_tier_label,
    cardsSold: row.cards_sold,
    matchedPattern: row.matched_pattern,
    createdAt: row.created_at,
  };
}

function mapGameStatus(status) {
  switch (String(status || 'idle')) {
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'finished':
      return 'Finished';
    default:
      return 'Waiting';
  }
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function filterRecordsByRange(records, { from = null, to = null, search = '' } = {}) {
  const query = String(search || '').trim().toLowerCase();

  return records.filter((record) => {
    const ended = String(record.gameEndedAt || '').slice(0, 10);
    if (from && ended < from) return false;
    if (to && ended > to) return false;

    if (!query) return true;

    const haystack = [
      record.sessionId,
      record.operatorName,
      record.cartelaNumber,
      record.matchedPattern,
      record.completionReason,
      record.roomId,
    ]
      .filter((value) => value != null)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

function summarizeRecords(records) {
  return records.reduce(
    (summary, record) => {
      summary.games += 1;
      summary.totalSales += Number(record.totalCollected || 0);
      summary.totalCommission += Number(record.commission || 0);
      summary.totalWinnerPayout += Number(record.winnerPayout || 0);
      summary.totalCardsSold += Number(record.cardsSold || 0);
      return summary;
    },
    {
      games: 0,
      totalSales: 0,
      totalCommission: 0,
      totalWinnerPayout: 0,
      totalCardsSold: 0,
    },
  );
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function getAdminDashboard(roomId = DEFAULT_ROOM_ID) {
  const room = roomManager.getRoom(roomId);
  const state = room.getPublicState();
  const sales = state.sales || {};
  const prize = state.prize || {};
  const soldCartelas = Number(sales.cardsSold ?? prize.cardsSold ?? 0);
  const availableCartelas = Math.max(0, TOTAL_CARTELAS - soldCartelas);
  const totalSales = Number(prize.totalSales ?? sales.totalSales ?? 0);
  const winnerPrize = Number(prize.prizePool ?? 0);
  const houseCommission = Number(prize.houseCommission ?? 0);

  const today = getLocalDateString();
  const dailyHistory = queryGameSalesHistory({ period: 'day', date: today });
  const dailySummary = summarizeRecords(dailyHistory.records);

  return {
    roomId,
    onlinePlayers: getOnlineCount(roomId),
    onlineBreakdown: getOnlineBreakdown(),
    soldCartelas,
    availableCartelas,
    totalCartelas: TOTAL_CARTELAS,
    totalSales: roundMoney(totalSales),
    winnerPrize: roundMoney(winnerPrize),
    houseCommission: roundMoney(houseCommission),
    gameStatus: mapGameStatus(state.status),
    gameStatusRaw: state.status,
    prizeLocked: Boolean(state.prizeLocked),
    calledCount: Array.isArray(state.calledNumbers) ? state.calledNumbers.length : 0,
    currentCall: state.currentCall ?? null,
    betAmount: Number(sales.betAmount ?? prize.betAmount ?? 0),
    commissionRate: Number(prize.commissionRate ?? 0),
    daily: {
      date: today,
      ...dailySummary,
      totalSales: roundMoney(dailySummary.totalSales),
      totalCommission: roundMoney(dailySummary.totalCommission),
      totalWinnerPayout: roundMoney(dailySummary.totalWinnerPayout),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getAdminReports({
  period = 'all',
  date = null,
  from = null,
  to = null,
  search = '',
} = {}) {
  const history = queryGameSalesHistory({
    period: period === 'week' ? 'all' : period,
    date,
  });

  let records = history.records;

  if (period === 'week') {
    const end = to || getLocalDateString();
    const endDate = new Date(`${end}T23:59:59`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    const weekFrom = from || getLocalDateString(startDate);
    records = filterRecordsByRange(records, { from: weekFrom, to: end, search });
  } else {
    records = filterRecordsByRange(records, { from, to, search });
  }

  const summary = summarizeRecords(records);
  const winners = selectWinnerHistory
    .all(200)
    .map(mapWinnerRow)
    .filter((winner) => {
      const created = String(winner.createdAt || '').slice(0, 10);
      if (from && created < from) return false;
      if (to && created > to) return false;
      if (!search) return true;
      const query = String(search).toLowerCase();
      return [
        winner.cartelaNumber,
        winner.matchedPattern,
        winner.roomId,
        winner.commissionTierLabel,
      ]
        .filter((value) => value != null)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

  return {
    period,
    date,
    from,
    to,
    search,
    summary: {
      games: summary.games,
      totalRevenue: roundMoney(summary.totalSales),
      totalCommission: roundMoney(summary.totalCommission),
      totalWinnerPayout: roundMoney(summary.totalWinnerPayout),
      totalCardsSold: summary.totalCardsSold,
      dailySales: period === 'day' ? roundMoney(summary.totalSales) : roundMoney(summary.totalSales),
      weeklySales: period === 'week' ? roundMoney(summary.totalSales) : null,
      monthlySales: period === 'month' ? roundMoney(summary.totalSales) : null,
    },
    gameHistory: records,
    winnerHistory: winners,
    total: records.length,
  };
}
