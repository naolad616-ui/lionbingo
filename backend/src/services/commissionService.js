import {
  buildDefaultCommissionMap,
  COMMISSION_SETTINGS_KEY,
  DEFAULT_COMMISSION_TIERS,
} from '../constants/commissionDefaults.js';
import { readCachedSetting, writeCachedSetting } from './settingsCache.js';

function readSavedMap() {
  const saved = readCachedSetting(COMMISSION_SETTINGS_KEY, {});
  return saved && typeof saved === 'object' ? saved : {};
}

function normalizeTierValue(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function getCommissionTiers() {
  const saved = readSavedMap();

  return DEFAULT_COMMISSION_TIERS.map((tier) => ({
    id: tier.id,
    label: tier.label,
    value: normalizeTierValue(saved[tier.id], tier.value),
  }));
}

export function getCommissionRateMap() {
  return getCommissionTiers().reduce((acc, tier) => {
    acc[tier.id] = tier.value;
    return acc;
  }, {});
}

export async function saveCommissionTiers(input) {
  const current = buildDefaultCommissionMap();
  const saved = readSavedMap();
  const base = { ...current, ...saved };

  if (Array.isArray(input)) {
    for (const tier of input) {
      if (!tier?.id || !(tier.id in base)) continue;
      base[tier.id] = normalizeTierValue(tier.value, base[tier.id]);
    }
  } else if (input && typeof input === 'object') {
    for (const [id, value] of Object.entries(input)) {
      if (!(id in base)) continue;
      base[id] = normalizeTierValue(value, base[id]);
    }
  }

  await writeCachedSetting(COMMISSION_SETTINGS_KEY, base);
  return getCommissionTiers();
}

export function resolveCommissionTier(cardsSold) {
  const count = Number(cardsSold);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count <= 2) return null;

  const tiers = getCommissionTiers();

  if (count > 60) {
    return tiers.find((tier) => tier.id === 'over-60') ?? null;
  }

  return (
    tiers.find((tier) => {
      const definition = DEFAULT_COMMISSION_TIERS.find((item) => item.id === tier.id);
      if (!definition || definition.maxCards === null) return false;
      return count >= definition.minCards && count <= definition.maxCards;
    }) ?? null
  );
}

export function getCommissionRateForCards(cardsSold) {
  const count = Number(cardsSold);
  if (!Number.isFinite(count) || count <= 0 || count <= 2) {
    return 0;
  }

  const tier = resolveCommissionTier(cardsSold);
  return tier?.value ?? 0;
}
