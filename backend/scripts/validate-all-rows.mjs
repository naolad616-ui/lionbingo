import fs from 'node:fs';
import path from 'node:path';

const tmp = path.join('data', '_xlsx_tmp');
const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

const REQUIRED_COLUMNS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const COLUMN_RANGES = [
  { cols: ['B', 'C', 'D', 'E', 'F'], min: 1, max: 15 },
  { cols: ['G', 'H', 'I', 'J', 'K'], min: 16, max: 30 },
  { cols: ['L', 'M', 'N', 'O', 'P'], min: 31, max: 45 },
  { cols: ['Q', 'R', 'S', 'T', 'U'], min: 46, max: 60 },
  { cols: ['V', 'W', 'X', 'Y', 'Z'], min: 61, max: 75 },
];

function parseRowCurrent(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }
  return rowValues;
}

function parseRowAlt(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)];
  const rowValues = {};
  for (const [, column, , attrs, inner] of cells) {
    if (!inner) continue;
    const valueMatch = inner.match(/<v>([^<]*)<\/v>/);
    if (!valueMatch) continue;
    const rawValue = valueMatch[1];
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }
  return rowValues;
}

function isRowEmpty(rowValues) {
  return Object.keys(rowValues).length === 0;
}

function isHeaderRow(rowValues) {
  return rowValues.A === 'cardId';
}

function resolveCardId(rowNumber, columnA, dataRowIndex) {
  const fromColumn = Number(columnA);
  if (Number.isInteger(fromColumn) && fromColumn > 0) {
    return fromColumn;
  }
  return dataRowIndex;
}

function validateRow(rowNumber, rowValues, cardId) {
  const reasons = [];
  if (!Number.isInteger(cardId) || cardId <= 0) {
    reasons.push('invalid cardId');
  }

  for (const col of REQUIRED_COLUMNS) {
    if (rowValues[col] === undefined || rowValues[col] === '') {
      reasons.push(`missing column ${col}`);
    }
  }

  for (const { cols, min, max } of COLUMN_RANGES) {
    for (const col of cols) {
      const value = Number(rowValues[col]);
      if (!Number.isInteger(value)) {
        reasons.push(`${col} is not an integer`);
        continue;
      }
      if (col === 'N' && value !== 0) {
        reasons.push('center cell N must be 0 (FREE)');
      } else if (col !== 'N' && (value < min || value > max)) {
        reasons.push(`${col} value ${value} outside ${min}-${max}`);
      }
    }
  }

  return reasons;
}

let dataRowIndex = 0;
const issues = [];

for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  const current = parseRowCurrent(rowXml);
  const alt = parseRowAlt(rowXml);

  if (isRowEmpty(current)) {
    if (!isRowEmpty(alt)) {
      issues.push({ rowNum, type: 'parser-gap', altKeys: Object.keys(alt) });
    }
    continue;
  }

  if (isHeaderRow(current)) continue;

  dataRowIndex += 1;
  const cardId = resolveCardId(rowNum, current.A, dataRowIndex);
  const reasons = validateRow(rowNum, current, cardId);
  if (reasons.length > 0) {
    issues.push({ rowNum, cardId, reasons });
  }
}

console.log('Data rows:', dataRowIndex);
console.log('Validation issues:', issues.length);
for (const issue of issues) {
  console.log(JSON.stringify(issue));
}

// Test cardId = dataRowIndex for all rows
const byIndex = new Map();
dataRowIndex = 0;
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  const rowValues = parseRowCurrent(rowXml);
  if (isRowEmpty(rowValues) || isHeaderRow(rowValues)) continue;
  dataRowIndex += 1;
  byIndex.set(dataRowIndex, rowNum);
}
const missingIndex = [];
for (let i = 1; i <= 150; i++) if (!byIndex.has(i)) missingIndex.push(i);
console.log('By dataRowIndex missing:', missingIndex);
