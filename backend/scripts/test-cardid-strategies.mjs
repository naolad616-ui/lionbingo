import fs from 'node:fs';
import path from 'node:path';

const tmp = path.join('data', '_xlsx_tmp');
const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

function parseRow(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const v = {};
  for (const [, col, , attrs, raw] of cells) {
    v[col] = attrs.includes('t="s"') ? sharedStrings[Number(raw)] : raw;
  }
  return v;
}

// Strategy: row 125 A=125 -> cardId 124; rows 126-150 use A as cardId; rows 2-124 use A
const mapping = new Map();
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const v = parseRow(rowXml);
  const a = Number(v.A);
  let cardId;
  if (rowNum === 125) cardId = 124;
  else if (rowNum >= 126) cardId = a;
  else cardId = a;
  mapping.set(cardId, rowNum);
}

const missing = [];
for (let i = 1; i <= 150; i++) if (!mapping.has(i)) missing.push(i);
console.log('Hybrid mapping count:', mapping.size, 'missing:', missing);

// Strategy: rowNumber - 1
const mapping2 = new Map();
for (const [, rowNumber] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  mapping2.set(rowNum - 1, rowNum);
}
const missing2 = [];
for (let i = 1; i <= 150; i++) if (!mapping2.has(i)) missing2.push(i);
console.log('rowNum-1 count:', mapping2.size, 'missing:', missing2);

// Strategy: sequential from column A with gap fill
let expected = 1;
const mapping3 = new Map();
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const a = Number(parseRow(rowXml).A);
  let cardId;
  if (a === expected) cardId = a;
  else if (a === expected + 1) cardId = expected; // gap in A
  else cardId = a; // fallback
  mapping3.set(cardId, rowNum);
  expected = cardId + 1;
}
const missing3 = [];
for (let i = 1; i <= 150; i++) if (!mapping3.has(i)) missing3.push(i);
console.log('sequential gap fill count:', mapping3.size, 'missing:', missing3);

// Strategy: rows 2-124 use A, row 125 -> 124, rows 126-149 use A-1, row 150 use 150
const mapping4 = new Map();
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const a = Number(parseRow(rowXml).A);
  let cardId;
  if (rowNum <= 124) cardId = a;
  else if (rowNum === 125) cardId = 124;
  else if (rowNum === 150) cardId = 150;
  else cardId = a - 1;
  mapping4.set(cardId, rowNum);
}
const missing4 = [];
for (let i = 1; i <= 150; i++) if (!mapping4.has(i)) missing4.push(i);
console.log('refined hybrid count:', mapping4.size, 'missing:', missing4);
