import {
  appendGameSalesRecord,
  queryGameSalesHistory,
} from '../services/salesHistoryService.js';

export function getSalesHistory(req, res) {
  const period = req.query.period || 'all';
  const date = req.query.date || null;

  const result = queryGameSalesHistory({ period, date });
  res.json(result);
}

export function postSalesHistory(req, res) {
  const result = appendGameSalesRecord(req.body ?? {});

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(result.created ? 201 : 200).json(result);
}
