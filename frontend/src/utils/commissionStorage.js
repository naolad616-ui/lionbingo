import { COMMISSION_TIER_DEFINITIONS } from './commissionRules';

export const COMMISSION_STORAGE_KEY = 'lionbingo-commission-rates';

export const DEFAULT_COMMISSION_TIERS = COMMISSION_TIER_DEFINITIONS.map((tier) => ({
  id: tier.id,
  label: tier.label,
  value: tier.defaultValue,
}));

export function loadCommissionRates() {
  try {
    const raw = localStorage.getItem(COMMISSION_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_COMMISSION_TIERS.map((tier) => ({ ...tier }));
    }

    const saved = JSON.parse(raw);
    return DEFAULT_COMMISSION_TIERS.map((tier) => ({
      ...tier,
      value: saved[tier.id] ?? tier.value,
    }));
  } catch {
    return DEFAULT_COMMISSION_TIERS.map((tier) => ({ ...tier }));
  }
}

export function saveCommissionRates(tiers) {
  const payload = tiers.reduce((acc, tier) => {
    acc[tier.id] = tier.value;
    return acc;
  }, {});
  localStorage.setItem(COMMISSION_STORAGE_KEY, JSON.stringify(payload));
}
