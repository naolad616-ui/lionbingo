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
  const parsed = parseCartelaNo(rawCartelaNo);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.reason });
    return;
  }

  const lookup = describeCartelaLookup(parsed.cartelaNo);
  const cartela = lookup.cartela;
  if (!cartela) {
    console.error('[cartela-lookup] card unavailable for valid range:', parsed.cartelaNo);
    res.status(500).json({ error: 'Unable to load cartela data' });
    return;
  }

  res.json(buildCartelaResponse(parsed.cartelaNo, cartela));
}

export function getCartelaByNumber(req, res) {
  respondWithCartela(req, res, extractCartelaNo(req));
}

export function checkCartela(req, res) {
  respondWithCartela(req, res, extractCartelaNo(req));
}
