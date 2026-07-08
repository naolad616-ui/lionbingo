export const COMMISSION_SETTINGS_KEY = 'lionbingo-commission-rates';

export const DEFAULT_COMMISSION_TIERS = [
  { id: '3-5', label: '3 - 5', minCards: 3, maxCards: 5, value: 10 },
  { id: '6-10', label: '6 - 10', minCards: 6, maxCards: 10, value: 10 },
  { id: '11-20', label: '11 - 20', minCards: 11, maxCards: 20, value: 20 },
  { id: '21-30', label: '21 - 30', minCards: 21, maxCards: 30, value: 25 },
  { id: '31-40', label: '31 - 40', minCards: 31, maxCards: 40, value: 28 },
  { id: '41-50', label: '41 - 50', minCards: 41, maxCards: 50, value: 30 },
  { id: '51-60', label: '51 - 60', minCards: 51, maxCards: 60, value: 32 },
  { id: 'over-60', label: '> 60', minCards: 61, maxCards: null, value: 35 },
];

export function buildDefaultCommissionMap() {
  return DEFAULT_COMMISSION_TIERS.reduce((acc, tier) => {
    acc[tier.id] = tier.value;
    return acc;
  }, {});
}
