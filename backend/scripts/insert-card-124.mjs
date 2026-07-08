import XLSX from 'xlsx';
import path from 'node:path';

const xlsxPath = path.join('data', 'arada.xlsx');
const wb = XLSX.readFile(xlsxPath);
const sheetName = wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });

const card124 = {
  cardId: 124,
  b1: 5,
  b2: 9,
  b3: 11,
  b4: 3,
  b5: 4,
  i1: 21,
  i2: 25,
  i3: 29,
  i4: 30,
  i5: 19,
  n1: 37,
  n2: 32,
  n3: 0,
  n4: 33,
  n5: 34,
  g1: 54,
  g2: 52,
  g3: 50,
  g4: 57,
  g5: 60,
  o1: 64,
  o2: 67,
  o3: 63,
  o4: 68,
  o5: 66,
  userId: null,
};

const existing124 = rows.find((row) => row.cardId === 124);
if (!existing124) {
  console.error('cardId 124 row not found');
  process.exit(1);
}

const card125 = { ...existing124, cardId: 125 };
Object.assign(existing124, card124);

if (!rows.some((row) => row.cardId === 125)) {
  const insertIndex = rows.findIndex((row) => row.cardId === 126);
  if (insertIndex === -1) {
    console.error('cardId 126 row not found');
    process.exit(1);
  }
  rows.splice(insertIndex, 0, card125);
}

rows.sort((a, b) => Number(a.cardId) - Number(b.cardId));

const card105 = rows.find((row) => row.cardId === 105);
const card106 = rows.find((row) => row.cardId === 106);
const gridFields = [
  'b1', 'b2', 'b3', 'b4', 'b5',
  'i1', 'i2', 'i3', 'i4', 'i5',
  'n1', 'n2', 'n3', 'n4', 'n5',
  'g1', 'g2', 'g3', 'g4', 'g5',
  'o1', 'o2', 'o3', 'o4', 'o5',
];
const gridSignature = (row) => gridFields.map((field) => row[field]).join(',');

if (card105 && card106 && gridSignature(card105) === gridSignature(card106)) {
  const used = new Set([card106.g1, card106.g2, card106.g3, card106.g4, card106.g5].map(Number));
  for (let value = 46; value <= 60; value += 1) {
    if (!used.has(value)) {
      card106.g5 = value;
      break;
    }
  }
}

const cardIds = rows.map((row) => row.cardId);
const missing = [];
for (let id = 1; id <= 150; id += 1) {
  if (!cardIds.includes(id)) missing.push(id);
}

const dupes = cardIds.filter((id, index) => cardIds.indexOf(id) !== index);

console.log('rows:', rows.length);
console.log('missing:', missing);
console.log('duplicate cardIds:', [...new Set(dupes)]);

if (missing.length > 0 || dupes.length > 0) {
  process.exit(1);
}

const header = Object.keys(rows[0]);
const nextSheet = XLSX.utils.json_to_sheet(rows, { header });
wb.Sheets[sheetName] = nextSheet;
XLSX.writeFile(wb, xlsxPath);
console.log('arada.xlsx updated: card 124 inserted, card 125 restored, 150 rows total');
