import fs from 'node:fs';
import path from 'node:path';

const tmp = path.join('data', '_xlsx_fresh');
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

function parseRow(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const v = {};
  for (const [, col, , attrs, raw] of cells) v[col] = attrs.includes('t="s"') ? sharedStrings[Number(raw)] : raw;
  return v;
}

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

function validateGrid(rowNum, grid) {
  const issues = [];
  const cols = ['B', 'I', 'N', 'G', 'O'];
  const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 5; r++) {
      const val = grid[r][c];
      if (r === 2 && c === 2) {
        if (val !== 0) issues.push('center not FREE');
        continue;
      }
      const [min, max] = ranges[c];
      if (!Number.isInteger(val) || val < min || val > max) {
        issues.push(`cell [${r}][${c}]=${val} outside ${min}-${max}`);
      }
    }
    const colVals = grid.map((row) => row[c]).filter((_, r) => !(r === 2 && c === 2));
    const unique = new Set(colVals);
    if (unique.size !== colVals.length) issues.push(`column ${cols[c]} has duplicates`);
  }
  return issues;
}

const bad = [];
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const v = parseRow(rowXml);
  const missing = REQUIRED_COLUMNS.filter((col) => v[col] === undefined);
  if (missing.length) bad.push({ rowNum, type: 'missing', missing });
  const grid = rowToGrid(v);
  const issues = validateGrid(rowNum, grid);
  if (issues.length) bad.push({ rowNum, cardId: v.A, issues });
}
console.log('Bad rows:', bad.length);
for (const b of bad) console.log(b);
