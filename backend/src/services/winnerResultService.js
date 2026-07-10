import { getNextSequence, WinnerResult } from '../models/index.js';

export async function recordWinnerSettlement({
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

  const id = await getNextSequence('winner_results');

  await WinnerResult.create({
    id,
    room_id: settlement.roomId,
    cartela_number: settlement.cartelaNumber,
    total_pool: settlement.totalPool,
    winner_payout: settlement.winnerPayout,
    house_profit: settlement.houseProfit,
    commission_rate: settlement.commissionRate,
    commission_tier_id: settlement.commissionTierId,
    commission_tier_label: settlement.commissionTierLabel,
    cards_sold: settlement.cardsSold,
    matched_pattern: settlement.matchedPattern,
    created_at: settlement.recordedAt,
  });

  console.log('[winner-settlement]', JSON.stringify(settlement));
  return settlement;
}

export async function finalizeValidatedWinner(room, result, cartelaNumber) {
  if (!result.valid) {
    return result;
  }

  const prize = room.refreshPrizePool();
  room.pause();

  const settlement = await recordWinnerSettlement({
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

export async function listWinnerResults(limit = 200) {
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  return WinnerResult.find({})
    .sort({ created_at: -1, id: -1 })
    .limit(safeLimit)
    .lean();
}
