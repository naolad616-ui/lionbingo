import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('data');
const tmp = path.join(root, '_xlsx_tmp');
const xlsxPath = path.join(root, 'arada.xlsx');

if (!fs.existsSync(path.join(tmp, 'xl/worksheets/sheet1.xml'))) {
  fs.mkdirSync(tmp, { recursive: true });
  execSync(`tar -xf "${xlsxPath}" -C "${tmp}"`, { stdio: 'pipe' });
}

const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rowMatches = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

console.log('Total row elements:', rowMatches.length);

const cardIds = [];
const skipped = [];

for (const [, rowNumber, rowXml] of rowMatches) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;

  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }

  const cardId = Number(rowValues.A);
  if (!Number.isInteger(cardId) || cardId <= 0) {
    skipped.push({ rowNum, reason: 'invalid-cardId', A: rowValues.A, keys: Object.keys(rowValues) });
    continue;
  }

  cardIds.push(cardId);
}

const unique = [...new Set(cardIds)].sort((a, b) => a - b);
const missing = [];
for (let id = 1; id <= 150; id += 1) {
  if (!unique.includes(id)) missing.push(id);
}

const dupes = cardIds.filter((id, i) => cardIds.indexOf(id) !== i);

console.log('Imported cardIds count:', cardIds.length);
console.log('Unique cardIds count:', unique.length);
console.log('Missing 1-150:', missing);
console.log('Duplicates:', [...new Set(dupes)]);
console.log('Skipped rows:', skipped);

// Also try alternate cell regex for rows with different format
for (const [, rowNumber, rowXml] of rowMatches) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const altCells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)];
  if (altCells.length > 0 && skipped.some((s) => s.rowNum === rowNum)) {
    console.log('Row', rowNum, 'alt cells:', altCells.length, rowXml.slice(0, 200));
  }
}
