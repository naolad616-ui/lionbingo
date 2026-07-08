import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('data');
const tmp = path.join(root, '_xlsx_tmp');
if (!fs.existsSync(path.join(tmp, 'xl/worksheets/sheet1.xml'))) {
  fs.mkdirSync(tmp, { recursive: true });
  execSync(`tar -xf "${path.join(root, 'arada.xlsx')}" -C "${tmp}"`, { stdio: 'pipe' });
}

const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rowMatches = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

const REQUIRED_COLUMNS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

function parseRow(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }
  return rowValues;
}

for (const [, rowNumber, rowXml] of rowMatches) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;

  const rowValues = parseRow(rowXml);
  const missing = REQUIRED_COLUMNS.filter((col) => rowValues[col] === undefined);
  const cardId = Number(rowValues.A);

  if (missing.length > 0 || !Number.isInteger(cardId) || cardId <= 0) {
    console.log('Row', rowNum, 'cardId', rowValues.A, 'missing cols', missing);
  }
}

// Old regex without t="n" - check rows where first regex fails
let oldFail = [];
for (const [, rowNumber, rowXml] of rowMatches) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }
  const cardId = Number(rowValues.A);
  if (!Number.isInteger(cardId) || cardId <= 0) oldFail.push(rowNum);
}
console.log('Rows failing cardId parse:', oldFail);
