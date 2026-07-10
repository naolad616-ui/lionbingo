import { getCommissionTiers, saveCommissionTiers } from '../services/commissionService.js';
import { calculatePrizePool } from '../services/prizePoolService.js';

export function getCommission(_req, res) {
  res.json({ tiers: getCommissionTiers() });
}

export async function updateCommission(req, res) {
  const payload = req.body?.tiers ?? req.body ?? {};
  const tiers = await saveCommissionTiers(payload);

  const io = req.app.get('io');
  if (io) {
    io.emit('commission:updated', { tiers });
  }

  res.json({ tiers });
}

export function previewPrizePool(req, res) {
  const { totalSales, cardsSold, betAmount } = req.body ?? {};
  const result = calculatePrizePool({ totalSales, cardsSold, betAmount });
  res.json(result);
}
