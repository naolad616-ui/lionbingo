import { describeCartelaLookup } from '../services/cartelaService.js';

const MIN_CARTELA_NO = 1;
const MAX_CARTELA_NO = 150;

function extractCartelaNo(req) {
  return (
    req.params?.cartelaNo
    ?? req.params?.cartelaNumber
    ?? req.params?.cardId
    ?? req.query?.cartelaNo
    ?? req.query?.cartelaNumber
    ?? req.query?.cartela_no
    ?? req.body?.cartelaNo
    ?? req.body?.cartelaNumber
    ?? req.body?.cartela_no
  );
}

function parseCartelaNo(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, reason: 'Invalid cartela number' };
  }

  const trimmed = String(value).trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: 'Invalid cartela number' };
  }

  const cartelaNo = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(cartelaNo) || cartelaNo < MIN_CARTELA_NO || cartelaNo > MAX_CARTELA_NO) {
    return { ok: false, reason: 'Invalid cartela number' };
  }

  return { ok: true, cartelaNo };
}

function formatNumbers(grid) {
  return grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (rowIndex === 2 && colIndex === 2 && cell === 0) {
        return 'FREE';
      }
      return cell;
    }),
  );
}

function buildCartelaResponse(cartelaNo, cartela) {
  return {
    cartelaNo: String(cartelaNo),
    numbers: formatNumbers(cartela.grid),
  };
}

function respondWithCartela(req, res, rawCartelaNo) {
  const route = req.originalUrl ?? req.url ?? 'unknown';
  console.log('[cartela-lookup] route:', route, 'requested cardId:', rawCartelaNo);

  const parsed = parseCartelaNo(rawCartelaNo);
  if (!parsed.ok) {
    console.log('[cartela-lookup] invalid cardId:', rawCartelaNo, '-', parsed.reason);
    res.status(400).json({ error: parsed.reason });
    return;
  }

  const lookup = describeCartelaLookup(parsed.cartelaNo);
  console.log(
    '[cartela-lookup] cardId:',
    lookup.cardId,
    'existsInDb:',
    lookup.existsInDb,
    'existsInWorkbook:',
    lookup.existsInWorkbook,
    'source:',
    lookup.source ?? 'none',
  );

  const cartela = lookup.cartela;
  if (!cartela) {
    console.error('[cartela-lookup] card unavailable for valid range:', parsed.cartelaNo);
    res.status(500).json({ error: 'Unable to load cartela data' });
    return;
  }

  const payload = buildCartelaResponse(parsed.cartelaNo, cartela);
  console.log('[cartela-lookup] response cardId:', payload.cartelaNo);
  res.json(payload);
}

export function getCartelaByNumber(req, res) {
  respondWithCartela(req, res, extractCartelaNo(req));
}

export function checkCartela(req, res) {
  respondWithCartela(req, res, extractCartelaNo(req));
}
