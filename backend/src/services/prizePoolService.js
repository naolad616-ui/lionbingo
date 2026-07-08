import { getCommissionRateForCards, resolveCommissionTier } from './commissionService.js';

function roundCurrency(amount) {
  return Number(amount.toFixed(2));
}

export function normalizeGameSales({ betAmount, cardsSold, totalSales } = {}) {
  const cards = Math.max(0, Number.parseInt(String(cardsSold ?? 0), 10) || 0);
  const bet = Math.max(0, Number(betAmount) || 0);

  const hasExplicitTotal = totalSales !== null
    && totalSales !== undefined
    && totalSales !== '';
  const parsedTotal = hasExplicitTotal ? Number(totalSales) : Number.NaN;
  const sales = Number.isFinite(parsedTotal) && parsedTotal >= 0
    ? parsedTotal
    : (cards > 0 && bet > 0 ? bet * cards : 0);

  return {
    betAmount: bet,
    cardsSold: cards,
    totalSales: roundCurrency(sales),
  };
}

export function calculatePrizePool({
  totalSales,
  cardsSold,
  betAmount = null,
}) {
  const normalized = normalizeGameSales({ betAmount, cardsSold, totalSales });

  const cards = normalized.cardsSold;
  const sales = normalized.totalSales;
  const bet = normalized.betAmount;

  const tier = resolveCommissionTier(cards);
  const commissionRate = getCommissionRateForCards(cards);
  const houseCommission = roundCurrency(sales * (commissionRate / 100));
  const prizePool = roundCurrency(sales - houseCommission);

  return {
    cardsSold: cards,
    totalSales: sales,
    betAmount: bet,
    commissionTierId: tier?.id ?? null,
    commissionTierLabel: tier?.label ?? null,
    commissionRate,
    houseCommission,
    prizePool,
  };
}
