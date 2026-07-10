import {
  appendGameSalesRecord,
  queryGameSalesHistory,
} from '../services/salesHistoryService.js';

export async function getSalesHistory(req, res) {
  const period = req.query.period || 'all';
  const date = req.query.date || null;

  const result = await queryGameSalesHistory({ period, date });
  res.json(result);
}

export async function postSalesHistory(req, res) {
  const result = await appendGameSalesRecord(req.body ?? {});

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(result.created ? 201 : 200).json(result);
}
