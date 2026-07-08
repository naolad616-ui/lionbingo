export const COMMISSION_TIER_DEFINITIONS = [
  { id: '3-5', label: '3 - 5', minCards: 3, maxCards: 5, defaultValue: 10 },
  { id: '6-10', label: '6 - 10', minCards: 6, maxCards: 10, defaultValue: 10 },
  { id: '11-20', label: '11 - 20', minCards: 11, maxCards: 20, defaultValue: 20 },
  { id: '21-30', label: '21 - 30', minCards: 21, maxCards: 30, defaultValue: 25 },
  { id: '31-40', label: '31 - 40', minCards: 31, maxCards: 40, defaultValue: 28 },
  { id: '41-50', label: '41 - 50', minCards: 41, maxCards: 50, defaultValue: 30 },
  { id: '51-60', label: '51 - 60', minCards: 51, maxCards: 60, defaultValue: 32 },
  { id: 'over-60', label: '> 60', minCards: 61, maxCards: null, defaultValue: 35 },
];

export function roundCurrency(amount) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100) / 100;
}

export function getDefaultCommissionTiers() {
  return COMMISSION_TIER_DEFINITIONS.map((tier) => ({
    id: tier.id,
    label: tier.label,
    minCards: tier.minCards,
    maxCards: tier.maxCards,
    value: tier.defaultValue,
  }));
}

export function resolveCommissionTier(cardsSold, tiers = getDefaultCommissionTiers()) {
  const count = Number(cardsSold);
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  if (count <= 2) {
    return null;
  }

  if (count > 60) {
    return tiers.find((tier) => tier.id === 'over-60') ?? null;
  }

  return (
    tiers.find((tier) => {
      const definition = COMMISSION_TIER_DEFINITIONS.find((item) => item.id === tier.id);
      if (!definition || definition.maxCards === null) {
        return false;
      }

      return count >= definition.minCards && count <= definition.maxCards;
    }) ?? null
  );
}

export function getCommissionRate(cardsSold, tiers = getDefaultCommissionTiers()) {
  const count = Number(cardsSold);
  if (!Number.isFinite(count) || count <= 0 || count <= 2) {
    return 0;
  }

  const tier = resolveCommissionTier(count, tiers);
  return Number(tier?.value ?? 0);
}

export function calculateCommissionFromSales(totalSales, cardsSold, tiers = getDefaultCommissionTiers()) {
  const roundedTotalSales = roundCurrency(totalSales);
  const commissionRate = getCommissionRate(cardsSold, tiers);
  const commission = roundCurrency(roundedTotalSales * (commissionRate / 100));
  const winnerPrize = roundCurrency(roundedTotalSales - commission);

  return {
    totalSales: roundedTotalSales,
    commission,
    winnerPrize,
    commissionRate,
  };
}
