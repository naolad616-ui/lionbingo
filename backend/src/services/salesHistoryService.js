import { GameSalesHistory, getNextSequence } from '../models/index.js';

function normalizeRecord(input = {}) {
  const sessionId = String(input.sessionId ?? input.session_id ?? '').trim();
  if (!sessionId) {
    return null;
  }

  const gameStartedAt = input.gameStartedAt ?? input.game_started_at ?? null;
  const gameEndedAt = input.gameEndedAt ?? input.game_ended_at ?? null;

  if (!gameStartedAt || !gameEndedAt) {
    return null;
  }

  const finalWinningNumber = input.finalWinningNumber ?? input.final_winning_number;
  const parsedFinalNumber = finalWinningNumber == null ? null : Number(finalWinningNumber);

  return {
    sessionId,
    roomId: String(input.roomId ?? input.room_id ?? 'default'),
    gameStartedAt: String(gameStartedAt),
    gameEndedAt: String(gameEndedAt),
    finalWinningNumber: Number.isFinite(parsedFinalNumber) ? parsedFinalNumber : null,
    cardsSold: Number(input.cardsSold ?? input.cards_sold ?? 0),
    betAmount: Number(input.betAmount ?? input.bet_amount ?? 0),
    totalCollected: Number(input.totalCollected ?? input.total_collected ?? 0),
    commission: Number(input.commission ?? 0),
    winnerPayout: Number(input.winnerPayout ?? input.winner_payout ?? 0),
    cartelaNumber: input.cartelaNumber ?? input.cartela_number ?? null,
    matchedPattern: input.matchedPattern ?? input.matched_pattern ?? null,
    calledCount: Number(input.calledCount ?? input.called_count ?? 0),
    completionReason: String(input.completionReason ?? input.completion_reason ?? 'reset'),
    operatorName: input.operatorName ?? input.operator_name ?? null,
  };
}

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    roomId: row.room_id,
    gameStartedAt: row.game_started_at,
    gameEndedAt: row.game_ended_at,
    finalWinningNumber: row.final_winning_number,
    cardsSold: row.cards_sold,
    betAmount: row.bet_amount,
    totalCollected: row.total_collected,
    commission: row.commission,
    winnerPayout: row.winner_payout,
    cartelaNumber: row.cartela_number,
    matchedPattern: row.matched_pattern,
    calledCount: row.called_count,
    completionReason: row.completion_reason,
    operatorName: row.operator_name,
    createdAt: row.created_at,
  };
}

export async function appendGameSalesRecord(input) {
  const record = normalizeRecord(input);
  if (!record) {
    return { ok: false, error: 'Invalid sales history record' };
  }

  const existing = await GameSalesHistory.findOne({ session_id: record.sessionId }).lean();
  if (existing) {
    return { ok: true, created: false, record: mapRow(existing) };
  }

  const id = await getNextSequence('game_sales_history');

  try {
    const saved = await GameSalesHistory.create({
      id,
      session_id: record.sessionId,
      room_id: record.roomId,
      game_started_at: record.gameStartedAt,
      game_ended_at: record.gameEndedAt,
      final_winning_number: record.finalWinningNumber,
      cards_sold: record.cardsSold,
      bet_amount: record.betAmount,
      total_collected: record.totalCollected,
      commission: record.commission,
      winner_payout: record.winnerPayout,
      cartela_number: record.cartelaNumber,
      matched_pattern: record.matchedPattern,
      called_count: record.calledCount,
      completion_reason: record.completionReason,
      operator_name: record.operatorName,
      created_at: new Date().toISOString(),
    });

    return { ok: true, created: true, record: mapRow(saved.toObject()) };
  } catch (error) {
    if (error?.code === 11000) {
      const raced = await GameSalesHistory.findOne({ session_id: record.sessionId }).lean();
      return { ok: true, created: false, record: mapRow(raced) };
    }
    throw error;
  }
}

function buildHistoryFilter({ period = 'all', date = null }) {
  const normalizedPeriod = String(period || 'all').toLowerCase();
  const filter = {};

  if (normalizedPeriod === 'day' && date) {
    const day = String(date).slice(0, 10);
    filter.game_ended_at = { $regex: `^${day}` };
  } else if (normalizedPeriod === 'month' && date) {
    const monthValue = String(date).slice(0, 7);
    filter.game_ended_at = { $regex: `^${monthValue}` };
  } else if (normalizedPeriod === 'year' && date) {
    const yearValue = String(date).slice(0, 4);
    filter.game_ended_at = { $regex: `^${yearValue}` };
  }

  return { filter, period: normalizedPeriod };
}

export async function queryGameSalesHistory(filters = {}) {
  const { filter, period } = buildHistoryFilter(filters);
  const rows = await GameSalesHistory.find(filter)
    .sort({ game_started_at: 1, id: 1 })
    .lean();

  return {
    period,
    date: filters.date ?? null,
    records: rows.map(mapRow),
    total: rows.length,
  };
}
