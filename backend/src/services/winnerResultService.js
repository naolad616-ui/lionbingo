import db from '../config/database.js';

const insertWinnerResult = db.prepare(`
  INSERT INTO winner_results (
    room_id,
    cartela_number,
    total_pool,
    winner_payout,
    house_profit,
    commission_rate,
    commission_tier_id,
    commission_tier_label,
    cards_sold,
    matched_pattern
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function recordWinnerSettlement({
  roomId,
  cartelaNumber,
  prize,
  matchedPattern = null,
}) {
  const settlement = {
    roomId,
    cartelaNumber: Number(cartelaNumber),
    totalPool: prize.totalSales,
    winnerPayout: prize.prizePool,
    houseProfit: prize.houseCommission,
    commissionRate: prize.commissionRate,
    commissionTierId: prize.commissionTierId ?? null,
    commissionTierLabel: prize.commissionTierLabel ?? null,
    cardsSold: prize.cardsSold,
    matchedPattern,
    recordedAt: new Date().toISOString(),
  };

  insertWinnerResult.run(
    settlement.roomId,
    settlement.cartelaNumber,
    settlement.totalPool,
    settlement.winnerPayout,
    settlement.houseProfit,
    settlement.commissionRate,
    settlement.commissionTierId,
    settlement.commissionTierLabel,
    settlement.cardsSold,
    settlement.matchedPattern,
  );

  console.log('[winner-settlement]', JSON.stringify(settlement));
  return settlement;
}

export function finalizeValidatedWinner(room, result, cartelaNumber) {
  if (!result.valid) {
    return result;
  }

  const prize = room.refreshPrizePool();
  room.pause();

  const settlement = recordWinnerSettlement({
    roomId: room.roomId,
    cartelaNumber,
    prize,
    matchedPattern: result.matchedPattern ?? null,
  });

  room.lastWinnerResult = settlement;

  return {
    ...result,
    prize,
    settlement,
  };
}
