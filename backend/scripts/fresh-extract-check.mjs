import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('data');
const tmp = path.join(root, '_xlsx_fresh');
const xlsxPath = path.join(root, 'arada.xlsx');

if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
execSync(`tar -xf "${xlsxPath}" -C "${tmp}"`, { stdio: 'pipe' });

const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

console.log('Fresh extract rows:', rows.length);

const noT = [];
const withTn = [];
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const aCell = cells.find((c) => c[1] === 'A');
  if (!aCell) {
    console.log('Row', rowNum, 'NO A cell');
    continue;
  }
  const attrs = aCell[3];
  if (attrs.includes('t="n"')) withTn.push(rowNum);
  else if (!attrs.includes('t=')) noT.push(rowNum);
}

console.log('Rows with numeric A (t=n):', withTn.length, 'first', withTn[0], 'last', withTn[withTn.length - 1]);
console.log('Rows with A no t attr:', noT.length, 'first', noT[0], 'last', noT[noT.length - 1]);

// Old buggy regex that required specific format?
const oldSkipped = [];
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }
  const cardId = Number(rowValues.A);
  if (!Number.isInteger(cardId) || cardId <= 0) oldSkipped.push({ rowNum, A: rowValues.A });
}
console.log('Would skip:', oldSkipped);

// Check for rows with <c .../> empty cells
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const selfClosing = (rowXml.match(/\/>/g) || []).length;
  const openClose = (rowXml.match(/<c r=/g) || []).length;
  if (selfClosing > 0) {
    console.log('Row', rowNum, 'has', selfClosing, 'self-closing of', openClose, 'cells');
  }
}
