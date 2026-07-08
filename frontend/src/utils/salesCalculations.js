import {
  calculateCommissionFromSales,
  getDefaultCommissionTiers,
  roundCurrency,
} from './commissionRules';

export { getDefaultCommissionTiers, roundCurrency };

function resolveFrontendTotalSales(session) {
  const cardsSold = Number(session.cardsSold || 0);
  const betAmount = Number(session.betAmount || 0);

  if (Number.isFinite(Number(session.totalSales))) {
    return roundCurrency(session.totalSales);
  }

  return roundCurrency(betAmount * cardsSold);
}

function logSalesBreakdown(sessionId, breakdown) {
  const check = roundCurrency(breakdown.totalSales - breakdown.commission);

  console.log('[sales-breakdown]', {
    sessionId,
    source: breakdown.source,
    commissionRateUsed: breakdown.commissionRate,
    totalSales: breakdown.totalSales,
    calculatedCommission: breakdown.commission,
    finalWinnerPrize: breakdown.winnerPrize,
    derivedWinnerPrize: check,
    exact: check === breakdown.winnerPrize,
  });
}

function finalizeBreakdown({
  sessionId,
  source,
  totalSales,
  commission,
  commissionRate = null,
}) {
  const roundedTotalSales = roundCurrency(totalSales);
  const roundedCommission = roundCurrency(commission);
  const winnerPrize = roundCurrency(roundedTotalSales - roundedCommission);

  const breakdown = {
    totalSales: roundedTotalSales,
    commission: roundedCommission,
    winnerPrize,
    commissionRate,
    source,
  };

  logSalesBreakdown(sessionId, breakdown);
  return breakdown;
}

function hasBackendPrizeSnapshot(session) {
  const snapshot = session.prizeSnapshot;
  return Boolean(
    snapshot
    && snapshot.source === 'backend'
    && Number.isFinite(Number(snapshot.totalSales))
    && Number.isFinite(Number(snapshot.houseCommission)),
  );
}

function hasBackendSettlement(session) {
  const commission = Number(session.houseProfit);
  const winnerPrize = Number(session.winnerPayout);

  return (
    session.status === 'completed'
    && Number.isFinite(commission)
    && commission >= 0
    && Number.isFinite(winnerPrize)
    && winnerPrize >= 0
    && (commission > 0 || winnerPrize > 0)
  );
}

function breakdownFromBackendSnapshot(session) {
  const snapshot = session.prizeSnapshot;

  return finalizeBreakdown({
    sessionId: session.id,
    source: 'backend',
    totalSales: snapshot.totalSales,
    commission: snapshot.houseCommission,
    commissionRate: snapshot.commissionRate ?? null,
  });
}

function breakdownFromBackendSettlement(session) {
  const commission = roundCurrency(session.houseProfit);
  const winnerPrize = roundCurrency(session.winnerPayout);
  const totalSales = roundCurrency(commission + winnerPrize);

  return finalizeBreakdown({
    sessionId: session.id,
    source: 'backend-settlement',
    totalSales,
    commission,
    commissionRate: session.commissionRate ?? null,
  });
}

function breakdownFromFrontend(session, tiers) {
  const totalSales = resolveFrontendTotalSales(session);
  const breakdown = calculateCommissionFromSales(totalSales, session.cardsSold, tiers);

  return finalizeBreakdown({
    sessionId: session.id,
    source: 'frontend',
    totalSales: breakdown.totalSales,
    commission: breakdown.commission,
    commissionRate: breakdown.commissionRate,
  });
}

export function calculateSalesBreakdown(session, tiers = getDefaultCommissionTiers()) {
  const path = hasBackendSettlement(session)
    ? 'backend-settlement'
    : hasBackendPrizeSnapshot(session)
      ? 'backend'
      : 'frontend';

  console.log('[sales-trace] calculateSalesBreakdown path', {
    sessionId: session.id,
    status: session.status,
    path,
    sessionCardsSold: session.cardsSold,
    sessionTotalSales: session.totalSales,
    sessionBetAmount: session.betAmount,
    hasPrizeSnapshot: Boolean(session.prizeSnapshot),
    prizeSnapshot: session.prizeSnapshot ?? null,
    houseProfit: session.houseProfit ?? null,
    winnerPayout: session.winnerPayout ?? null,
  });

  if (hasBackendSettlement(session)) {
    return breakdownFromBackendSettlement(session);
  }

  if (hasBackendPrizeSnapshot(session)) {
    return breakdownFromBackendSnapshot(session);
  }

  return breakdownFromFrontend(session, tiers);
}

export function calculateHouseCommission(session, tiers = getDefaultCommissionTiers()) {
  return calculateSalesBreakdown(session, tiers).commission;
}

export function mapSessionToSalesRow(session, index, tiers = getDefaultCommissionTiers(), operatorName = 'Abraham') {
  const { totalSales, commission, winnerPrize, source } = calculateSalesBreakdown(session, tiers);
  const numberOfCards = Number(session.cardsSold || 0);
  const pricePerCard = numberOfCards > 0
    ? roundCurrency(totalSales / numberOfCards)
    : roundCurrency(session.betAmount || 0);

  return {
    id: session.id,
    startedTime: session.startedAt,
    endedTime: session.endedAt || '',
    shopName: `${operatorName}${numberOfCards || index + 1}`,
    onCall: Number(session.calledCount || 0),
    finalWinningNumber: session.finalWinningNumber ?? null,
    numberOfCards,
    pricePerCard,
    collected: totalSales,
    commission,
    winnerPrize,
    source,
    by: operatorName,
  };
}

export function mapHistoryRecordToSalesRow(record, index, operatorName = 'Abraham') {
  const session = {
    id: record.sessionId,
    status: record.completionReason === 'winner' ? 'completed' : 'reset',
    startedAt: record.gameStartedAt,
    endedAt: record.gameEndedAt,
    betAmount: record.betAmount,
    cardsSold: record.cardsSold,
    totalSales: record.totalCollected,
    winnerPayout: record.winnerPayout,
    houseProfit: record.commission,
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

  return mapSessionToSalesRow(session, index, getDefaultCommissionTiers(), operatorName);
}

export function computeSalesPageSummaryFromHistory(
  records,
  operatorName = 'Abraham',
) {
  const tableRows = records.map((record, index) =>
    mapHistoryRecordToSalesRow(record, index, operatorName),
  );

  return {
    gamesPlayed: records.length,
    totalCartelas: records.reduce((sum, record) => sum + Number(record.cardsSold || 0), 0),
    totalSales: roundCurrency(tableRows.reduce((sum, row) => sum + Number(row.collected || 0), 0)),
    totalCommission: roundCurrency(tableRows.reduce((sum, row) => sum + Number(row.commission || 0), 0)),
    totalWinnerPrize: roundCurrency(tableRows.reduce((sum, row) => sum + Number(row.winnerPrize || 0), 0)),
    tableRows,
  };
}

export function computeSalesPageSummary(
  sessions,
  tiers = getDefaultCommissionTiers(),
  operatorName = 'Abraham',
) {
  const tableRows = sessions.map((session, index) =>
    mapSessionToSalesRow(session, index, tiers, operatorName),
  );

  return {
    gamesPlayed: sessions.length,
    totalCartelas: sessions.reduce((sum, session) => sum + Number(session.cardsSold || 0), 0),
    totalSales: roundCurrency(tableRows.reduce((sum, row) => sum + Number(row.collected || 0), 0)),
    totalCommission: roundCurrency(tableRows.reduce((sum, row) => sum + Number(row.commission || 0), 0)),
    totalWinnerPrize: roundCurrency(tableRows.reduce((sum, row) => sum + Number(row.winnerPrize || 0), 0)),
    tableRows,
  };
}
