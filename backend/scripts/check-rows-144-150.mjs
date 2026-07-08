import fs from 'node:fs';
import path from 'node:path';

const tmp = path.join('data', '_xlsx_fresh');
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

for (const n of [2, 3, 100, 143, 144, 145, 150]) {
  const row = rows.find((m) => Number(m[1]) === n);
  if (!row) continue;
  const aCell = row[2].match(/<c r="A\d+"[^>]*>/);
  const cellCount = (row[2].match(/<c r=/g) || []).length;
  console.log('Row', n, 'A cell:', aCell?.[0], 'cells:', cellCount);
}

// Simulate OLD import that skips invalid cardId - what if rows 144+ fail?
const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
let imported = 0;
const skipped = [];
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }
  const cardId = Number(rowValues.A);
  if (!Number.isInteger(cardId) || cardId <= 0) {
    skipped.push(rowNum);
    continue;
  }
  imported++;
}
console.log('Imported:', imported, 'skipped:', skipped);

// Check if rowToGrid produces all zeros for some rows
function rowToGrid(rowValues) {
  const read = (column) => Number(rowValues[column] ?? 0);
  return [
    [read('B'), read('G'), read('L'), read('Q'), read('V')],
    [read('C'), read('H'), read('M'), read('R'), read('W')],
    [read('D'), read('I'), read('N'), read('S'), read('X')],
    [read('E'), read('J'), read('O'), read('T'), read('Y')],
    [read('F'), read('K'), read('P'), read('U'), read('Z')],
  ];
}

const emptyGrids = [];
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }
  const grid = rowToGrid(rowValues);
  const sum = grid.flat().reduce((a, b) => a + b, 0);
  if (sum === 0) emptyGrids.push(rowNum);
}
console.log('Empty grids:', emptyGrids);
