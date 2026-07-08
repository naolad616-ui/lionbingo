import db from '../config/database.js';

const insertRecord = db.prepare(`
  INSERT OR IGNORE INTO game_sales_history (
    session_id,
    room_id,
    game_started_at,
    game_ended_at,
    final_winning_number,
    cards_sold,
    bet_amount,
    total_collected,
    commission,
    winner_payout,
    cartela_number,
    matched_pattern,
    called_count,
    completion_reason,
    operator_name
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectBySessionId = db.prepare(`
  SELECT *
  FROM game_sales_history
  WHERE session_id = ?
`);

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

export function appendGameSalesRecord(input) {
  const record = normalizeRecord(input);
  if (!record) {
    return { ok: false, error: 'Invalid sales history record' };
  }

  const existing = selectBySessionId.get(record.sessionId);
  if (existing) {
    return { ok: true, created: false, record: mapRow(existing) };
  }

  insertRecord.run(
    record.sessionId,
    record.roomId,
    record.gameStartedAt,
    record.gameEndedAt,
    record.finalWinningNumber,
    record.cardsSold,
    record.betAmount,
    record.totalCollected,
    record.commission,
    record.winnerPayout,
    record.cartelaNumber,
    record.matchedPattern,
    record.calledCount,
    record.completionReason,
    record.operatorName,
  );

  const saved = selectBySessionId.get(record.sessionId);
  return { ok: true, created: true, record: mapRow(saved) };
}

function buildHistoryQuery({ period = 'all', date = null }) {
  const normalizedPeriod = String(period || 'all').toLowerCase();
  const conditions = [];
  const params = [];

  if (normalizedPeriod === 'day' && date) {
    conditions.push(`strftime('%Y-%m-%d', game_ended_at) = ?`);
    params.push(String(date));
  } else if (normalizedPeriod === 'month' && date) {
    const monthValue = String(date).slice(0, 7);
    conditions.push(`strftime('%Y-%m', game_ended_at) = ?`);
    params.push(monthValue);
  } else if (normalizedPeriod === 'year' && date) {
    const yearValue = String(date).slice(0, 4);
    conditions.push(`strftime('%Y', game_ended_at) = ?`);
    params.push(yearValue);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT *
    FROM game_sales_history
    ${whereClause}
    ORDER BY datetime(game_started_at) ASC, id ASC
  `;

  return { sql, params, period: normalizedPeriod };
}

export function queryGameSalesHistory(filters = {}) {
  const { sql, params, period } = buildHistoryQuery(filters);
  const rows = db.prepare(sql).all(...params);

  return {
    period,
    date: filters.date ?? null,
    records: rows.map(mapRow),
    total: rows.length,
  };
}
