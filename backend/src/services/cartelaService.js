import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { Cartela } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../data');
const xlsxPath = path.join(dataDir, 'arada.xlsx');
const EXPECTED_CARD_COUNT = 150;
const SUCCESS_LOG_MESSAGE = '150 unique Bingo cards loaded successfully';

const GRID_FIELDS = [
  ['b1', 'i1', 'n1', 'g1', 'o1'],
  ['b2', 'i2', 'n2', 'g2', 'o2'],
  ['b3', 'i3', 'n3', 'g3', 'o3'],
  ['b4', 'i4', 'n4', 'g4', 'o4'],
  ['b5', 'i5', 'n5', 'g5', 'o5'],
];

const COLUMN_RANGES = [
  { min: 1, max: 15 },
  { min: 16, max: 30 },
  { min: 31, max: 45 },
  { min: 46, max: 60 },
  { min: 61, max: 75 },
];

/** @type {Map<number, number[][]>} */
const cartelaMemoryCache = new Map();

function rowToGrid(row) {
  return GRID_FIELDS.map((fields) =>
    fields.map((field) => Number(row[field] ?? 0)),
  );
}

function isRowEmpty(row) {
  const values = Object.values(row).filter((value) => value !== null && value !== undefined && value !== '');
  return values.length === 0;
}

function isHeaderRow(row) {
  return row.cardId === 'cardId' || row.b1 === 'b1';
}

function parseCardId(sheetCardId) {
  const id = Number(sheetCardId);
  if (!Number.isInteger(id) || id < 1 || id > EXPECTED_CARD_COUNT) {
    return { ok: false, reason: `invalid cardId value "${sheetCardId}"` };
  }

  return { ok: true, cardId: id };
}

function validateCartelaRow(rowNumber, row, cardId) {
  const reasons = [];

  if (!Number.isInteger(cardId) || cardId < 1 || cardId > EXPECTED_CARD_COUNT) {
    reasons.push(`cardId ${cardId} is invalid`);
  }

  for (const fields of GRID_FIELDS) {
    for (const field of fields) {
      if (row[field] === null || row[field] === undefined || row[field] === '') {
        reasons.push(`missing ${field}`);
      }
    }
  }

  const grid = rowToGrid(row);

  for (let col = 0; col < 5; col += 1) {
    const { min, max } = COLUMN_RANGES[col];

    for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
      const value = grid[rowIndex][col];
      const isCenter = rowIndex === 2 && col === 2;

      if (!Number.isInteger(value)) {
        reasons.push(`${GRID_FIELDS[rowIndex][col]} is not an integer`);
        continue;
      }

      if (isCenter) {
        if (value !== 0) {
          reasons.push('center cell n3 must be 0 (FREE)');
        }
        continue;
      }

      if (value < min || value > max) {
        reasons.push(`${GRID_FIELDS[rowIndex][col]} value ${value} is outside ${min}-${max}`);
      }
    }
  }

  return reasons;
}

function readWorkbookRows() {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Cartela workbook not found at ${xlsxPath}`);
  }

  const workbook = XLSX.readFile(xlsxPath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Cartela workbook does not contain any sheets');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
  return { rows, sheetName };
}

function setMemoryCacheFromDocs(docs) {
  cartelaMemoryCache.clear();
  for (const doc of docs) {
    cartelaMemoryCache.set(Number(doc.card_id), doc.grid);
  }
}

function verifyImportedCartelas(docs) {
  const importedIds = docs.map((row) => Number(row.card_id));
  const importedSet = new Set(importedIds);
  const missing = [];
  const duplicateIds = importedIds.filter((id, index) => importedIds.indexOf(id) !== index);

  for (let cardId = 1; cardId <= EXPECTED_CARD_COUNT; cardId += 1) {
    if (!importedSet.has(cardId)) {
      missing.push(cardId);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Cartela import verification failed: missing cardId(s) ${missing.join(', ')}`,
    );
  }

  if (duplicateIds.length > 0) {
    throw new Error(
      `Cartela import verification failed: duplicate cardId(s) ${[...new Set(duplicateIds)].join(', ')}`,
    );
  }

  if (docs.length !== EXPECTED_CARD_COUNT) {
    throw new Error(
      `Cartela import verification failed: expected ${EXPECTED_CARD_COUNT} cards, found ${docs.length}`,
    );
  }

  const card149 = docs.find((row) => Number(row.card_id) === 149);
  const card150 = docs.find((row) => Number(row.card_id) === 150);

  if (!card149 || !card150) {
    throw new Error('Cartela import verification failed: cardId 149 and/or 150 is missing');
  }

  if (JSON.stringify(card149.grid) === JSON.stringify(card150.grid)) {
    throw new Error('Cartela import verification failed: cardId 149 and cardId 150 are duplicates');
  }

  const gridOwners = new Map();

  for (const row of docs) {
    const key = JSON.stringify(row.grid);
    const owner = gridOwners.get(key);
    if (owner !== undefined) {
      throw new Error(
        `Cartela import verification failed: cardId ${row.card_id} duplicates cardId ${owner}`,
      );
    }
    gridOwners.set(key, row.card_id);
  }

  return EXPECTED_CARD_COUNT;
}

async function importCartelasFromWorkbook() {
  clearWorkbookCartelaCache();
  const { rows, sheetName } = readWorkbookRows();
  const invalidRows = [];
  const staged = new Map();
  let dataRowCount = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (isRowEmpty(row) || isHeaderRow(row)) {
      return;
    }

    dataRowCount += 1;

    const parsed = parseCardId(row.cardId);
    if (!parsed.ok) {
      invalidRows.push({ rowNumber, reason: parsed.reason });
      return;
    }

    const { cardId } = parsed;
    const reasons = validateCartelaRow(rowNumber, row, cardId);
    if (reasons.length > 0) {
      invalidRows.push({ rowNumber, reason: reasons.join('; ') });
      return;
    }

    if (staged.has(cardId)) {
      invalidRows.push({
        rowNumber,
        reason: `duplicate cardId ${cardId}`,
      });
      return;
    }

    staged.set(cardId, { cardId, grid: rowToGrid(row) });
  });

  for (const entry of invalidRows) {
    console.error(`Cartela import invalid row ${entry.rowNumber}: ${entry.reason}`);
  }

  if (invalidRows.length > 0) {
    throw new Error(
      `Cartela import failed: ${invalidRows.length} invalid row(s) in ${sheetName}. See server logs for row numbers and reasons.`,
    );
  }

  if (dataRowCount !== EXPECTED_CARD_COUNT || staged.size !== EXPECTED_CARD_COUNT) {
    throw new Error(
      `Cartela import failed: expected ${EXPECTED_CARD_COUNT} data rows in ${sheetName}, found ${dataRowCount}`,
    );
  }

  await Cartela.deleteMany({});

  const now = new Date().toISOString();
  const docs = [...staged.values()].map(({ cardId, grid }) => ({
    card_id: cardId,
    grid,
    updated_at: now,
  }));

  await Cartela.insertMany(docs, { ordered: true });
  verifyImportedCartelas(docs);
  setMemoryCacheFromDocs(docs);
  console.log(SUCCESS_LOG_MESSAGE);
  return EXPECTED_CARD_COUNT;
}

async function isCartelaSetComplete() {
  try {
    const docs = await Cartela.find({}).sort({ card_id: 1 }).lean();
    verifyImportedCartelas(docs);
    setMemoryCacheFromDocs(docs);
    return true;
  } catch {
    return false;
  }
}

export async function initializeCartelas() {
  if (await isCartelaSetComplete()) {
    console.log(
      `[cartelas] ${SUCCESS_LOG_MESSAGE} (verified in database; source workbook: ${xlsxPath})`,
    );
    return EXPECTED_CARD_COUNT;
  }

  return importCartelasFromWorkbook();
}

export function describeCartelaLookup(cardId) {
  const parsedId = Number.parseInt(String(cardId), 10);
  if (!Number.isInteger(parsedId) || parsedId < 1 || parsedId > EXPECTED_CARD_COUNT) {
    return {
      cardId: parsedId,
      inRange: false,
      existsInDb: false,
      existsInWorkbook: false,
      source: null,
      cartela: null,
      timingsMs: { memoryMs: 0, workbookMs: 0 },
    };
  }

  const memoryStart = process.hrtime.bigint();
  const fromDb = getCartelaById(parsedId);
  const memoryMs = Number(process.hrtime.bigint() - memoryStart) / 1e6;

  if (fromDb) {
    // Do not touch the XLSX workbook on the hot path when memory already has the card.
    return {
      cardId: parsedId,
      inRange: true,
      existsInDb: true,
      existsInWorkbook: null,
      source: 'memory',
      cartela: fromDb,
      timingsMs: {
        memoryMs: Number(memoryMs.toFixed(3)),
        workbookMs: 0,
      },
    };
  }

  const workbookStart = process.hrtime.bigint();
  const fromWorkbook = getCartelaForCheckCard(parsedId);
  const workbookMs = Number(process.hrtime.bigint() - workbookStart) / 1e6;

  return {
    cardId: parsedId,
    inRange: true,
    existsInDb: false,
    existsInWorkbook: Boolean(fromWorkbook),
    source: fromWorkbook ? 'workbook' : null,
    cartela: fromWorkbook,
    timingsMs: {
      memoryMs: Number(memoryMs.toFixed(3)),
      workbookMs: Number(workbookMs.toFixed(3)),
    },
  };
}

export function getCartelaById(cardId) {
  const parsedId = Number.parseInt(String(cardId), 10);
  if (!Number.isInteger(parsedId) || parsedId <= 0) return null;

  const grid = cartelaMemoryCache.get(parsedId);
  if (!grid) return null;

  return {
    cardId: parsedId,
    grid,
  };
}

let workbookCartelaCache = null;

function clearWorkbookCartelaCache() {
  workbookCartelaCache = null;
}

function readCartelaFromWorkbookRows(parsedId) {
  const { rows } = readWorkbookRows();

  for (const row of rows) {
    if (isRowEmpty(row) || isHeaderRow(row)) {
      continue;
    }

    const parsed = parseCardId(row.cardId);
    if (!parsed.ok || parsed.cardId !== parsedId) {
      continue;
    }

    return {
      cardId: parsedId,
      grid: rowToGrid(row),
    };
  }

  return null;
}

function getWorkbookCartelaMap() {
  if (workbookCartelaCache) {
    return workbookCartelaCache;
  }

  const { rows } = readWorkbookRows();
  const map = new Map();

  for (const row of rows) {
    if (isRowEmpty(row) || isHeaderRow(row)) {
      continue;
    }

    const parsed = parseCardId(row.cardId);
    if (!parsed.ok) {
      continue;
    }

    map.set(parsed.cardId, rowToGrid(row));
  }

  workbookCartelaCache = map;
  return map;
}

export function getCartelaFromWorkbook(cardId) {
  const parsedId = Number.parseInt(String(cardId), 10);
  if (!Number.isInteger(parsedId) || parsedId < 1 || parsedId > EXPECTED_CARD_COUNT) {
    return null;
  }

  const grid = getWorkbookCartelaMap().get(parsedId);
  if (!grid) {
    return null;
  }

  return {
    cardId: parsedId,
    grid,
  };
}

export function getCartelaForCheckCard(cartelaNo) {
  const parsedId = Number.parseInt(String(cartelaNo), 10);
  if (!Number.isInteger(parsedId) || parsedId < 1 || parsedId > EXPECTED_CARD_COUNT) {
    return null;
  }

  const fromDb = getCartelaById(parsedId);
  if (fromDb) {
    return fromDb;
  }

  const fromCache = getCartelaFromWorkbook(parsedId);
  if (fromCache) {
    return fromCache;
  }

  clearWorkbookCartelaCache();
  const fromRefreshedCache = getCartelaFromWorkbook(parsedId);
  if (fromRefreshedCache) {
    return fromRefreshedCache;
  }

  return readCartelaFromWorkbookRows(parsedId);
}

export function getCartelaGrid(cardId) {
  return getCartelaById(cardId)?.grid ?? null;
}
