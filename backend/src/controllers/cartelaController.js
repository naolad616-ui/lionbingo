import { describeCartelaLookup } from '../services/cartelaService.js';
import { createRequestTimer, measureSync } from '../utils/requestTimer.js';

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
  const timer = createRequestTimer('GET /api/cartela');
  timer.mark('arrival');

  const parsed = parseCartelaNo(rawCartelaNo);
  timer.mark('parse_done');
  if (!parsed.ok) {
    timer.log({
      cartelaNo: rawCartelaNo,
      ok: false,
      parseMs: timer.msBetween('arrival', 'parse_done'),
      error: parsed.reason,
    });
    res.status(400).json({ error: parsed.reason });
    return;
  }

  // Cartela cards are served from in-memory cache (loaded at startup from Mongo).
  // Track lookup vs any incidental Mongo work separately for Railway profiling.
  const mongoStart = process.hrtime.bigint();
  // No live Mongo query on the hot path today — record 0 when cache-only.
  const mongoQueryMs = 0;
  void mongoStart;

  const lookupMeasured = measureSync(() => describeCartelaLookup(parsed.cartelaNo));
  timer.mark('lookup_done');
  const lookup = lookupMeasured.value;
  const cartelaLookupMs = lookupMeasured.ms;
  const memoryMs = lookup.timingsMs?.memoryMs ?? null;
  const workbookMs = lookup.timingsMs?.workbookMs ?? null;

  const cartela = lookup.cartela;
  if (!cartela) {
    timer.log({
      cartelaNo: parsed.cartelaNo,
      ok: false,
      arrivalMs: 0,
      mongoQueryMs,
      cartelaLookupMs: Number(cartelaLookupMs.toFixed(2)),
      source: lookup.source,
      memoryHit: lookup.existsInDb,
      workbookChecked: lookup.existsInWorkbook,
      memoryLookupMs: lookup.timingsMs?.memoryMs ?? null,
      workbookLookupMs: lookup.timingsMs?.workbookMs ?? null,
      error: 'unavailable',
    });
    console.error('[cartela-lookup] card unavailable for valid range:', parsed.cartelaNo);
    res.status(500).json({ error: 'Unable to load cartela data' });
    return;
  }

  const serializeMeasured = measureSync(() => buildCartelaResponse(parsed.cartelaNo, cartela));
  timer.mark('serialize_done');
  const payload = serializeMeasured.value;
  const serializationMs = serializeMeasured.ms;

  // Validation for this endpoint is identity/range parse only (grid already trusted).
  const validationMs = timer.msBetween('arrival', 'parse_done') ?? 0;

  const profile = timer.log({
    cartelaNo: parsed.cartelaNo,
    ok: true,
    mongoQueryMs,
    cartelaLookupMs: Number(cartelaLookupMs.toFixed(2)),
    memoryLookupMs: memoryMs,
    workbookLookupMs: workbookMs,
    validationMs: Number(validationMs.toFixed(2)),
    serializationMs: Number(serializationMs.toFixed(2)),
    source: lookup.source,
    memoryHit: lookup.source === 'memory',
    workbookUsed: lookup.source === 'workbook',
  });

  res.setHeader(
    'Server-Timing',
    [
      `mongo;dur=${profile.mongoQueryMs};desc="MongoDB query"`,
      `lookup;dur=${profile.cartelaLookupMs};desc="Cartela lookup"`,
      `memory;dur=${memoryMs ?? 0};desc="Memory cache lookup"`,
      `workbook;dur=${workbookMs ?? 0};desc="Workbook fallback"`,
      `validate;dur=${profile.validationMs};desc="Validation"`,
      `serialize;dur=${profile.serializationMs};desc="Serialization"`,
      `total;dur=${profile.totalMs};desc="Total handler"`,
    ].join(', '),
  );
  res.setHeader('Access-Control-Expose-Headers', 'Server-Timing');

  res.json(payload);
}

export function getCartelaByNumber(req, res) {
  respondWithCartela(req, res, extractCartelaNo(req));
}

export function checkCartela(req, res) {
  respondWithCartela(req, res, extractCartelaNo(req));
}
