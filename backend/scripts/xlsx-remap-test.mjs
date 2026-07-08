import XLSX from 'xlsx';
import path from 'node:path';

const wb = XLSX.readFile(path.join('data', 'arada.xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets.Sheet1, { defval: null });

const around = rows.filter((r) => r.cardId >= 120 && r.cardId <= 130);
for (const r of around) {
  console.log('cardId', r.cardId, 'b1', r.b1, 'n3', r.n3);
}

// Test remap: cardId 125 -> 124, and for cardId > 125 use cardId - 1 except 150 stays 150
const mapping = new Map();
for (const r of rows) {
  let id = r.cardId;
  if (id === 125) id = 124;
  else if (id > 125 && id < 150) id = id - 1;
  mapping.set(id, r.cardId);
}
const missing = [];
for (let i = 1; i <= 150; i++) if (!mapping.has(i)) missing.push(i);
console.log('Remap v1 missing:', missing);

// Test: all cardId >= 125 get cardId - 1, except keep 150
const mapping2 = new Map();
for (const r of rows) {
  let id = r.cardId;
  if (id >= 125 && id < 150) id = id - 1;
  mapping2.set(id, r.cardId);
}
const missing2 = [];
for (let i = 1; i <= 150; i++) if (!mapping2.has(i)) missing2.push(i);
console.log('Remap v2 missing:', missing2);

// Test: cardId >= 125 subtract 1
const mapping3 = new Map();
for (const r of rows) {
  let id = r.cardId >= 125 ? r.cardId - 1 : r.cardId;
  mapping3.set(id, r.cardId);
}
const missing3 = [];
for (let i = 1; i <= 150; i++) if (!mapping3.has(i)) missing3.push(i);
console.log('Remap v3 (all >=125 minus 1) missing:', missing3);
