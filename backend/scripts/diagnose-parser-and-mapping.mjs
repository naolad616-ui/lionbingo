import fs from 'node:fs';
import path from 'node:path';

const tmp = path.join('data', '_xlsx_tmp');
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');

// Check rows 140-150 for cell format variations
for (let n = 140; n <= 150; n++) {
  const row = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].find((m) => Number(m[1]) === n);
  if (!row) continue;
  const rowXml = row[2];
  const standard = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const alt = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)];
  const inline = rowXml.includes('is="');
  const selfClose = rowXml.includes('/>');
  if (standard.length !== alt.length || selfClose) {
    console.log(`Row ${n}: standard=${standard.length} alt=${alt.length} selfClose=${selfClose}`);
  }
}

// Check all rows for cell count differences
let diffRows = [];
for (const [, rowNumber, rowXml] of sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const standard = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const alt = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)];
  const altWithValues = alt.filter((m) => m[4] && m[4].includes('<v>'));
  if (standard.length < 26 && altWithValues.length > standard.length) {
    diffRows.push({ row: rowNumber, standard: standard.length, alt: altWithValues.length });
  }
}
console.log('Rows with parser differences:', diffRows);

// Map cardId using: rows 2-124 use A; rows 125-150 use A-1 except row 150 uses A
const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
function parseRow(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const v = {};
  for (const [, col, , attrs, raw] of cells) v[col] = attrs.includes('t="s"') ? sharedStrings[Number(raw)] : raw;
  return v;
}

const mapping = new Map();
for (const [, rowNumber, rowXml] of sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const a = Number(parseRow(rowXml).A);
  let cardId;
  if (rowNum <= 124) cardId = a;
  else if (rowNum < 150) cardId = a - 1;
  else cardId = a;
  if (mapping.has(cardId)) console.log('DUPE', cardId, 'rows', mapping.get(cardId), rowNum);
  mapping.set(cardId, rowNum);
}
const missing = [];
for (let i = 1; i <= 150; i++) if (!mapping.has(i)) missing.push(i);
console.log('Final mapping size', mapping.size, 'missing', missing);
