import fs from 'node:fs';
import path from 'node:path';

const tmp = path.join('data', '_xlsx_tmp');
const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

function parseRow(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const v = {};
  for (const [, col, , attrs, raw] of cells) v[col] = attrs.includes('t="s"') ? sharedStrings[Number(raw)] : raw;
  return v;
}

const dataRows = [];
for (const [, rowNumber, rowXml] of rows) {
  const rowNum = Number(rowNumber);
  const v = parseRow(rowXml);
  if (rowNum === 1 && v.A === 'cardId') continue;
  if (Object.keys(v).length === 0) continue;
  dataRows.push({ rowNum, a: Number(v.A) });
}

function test(name, fn) {
  const m = new Map();
  let dupes = 0;
  for (const row of dataRows) {
    const cardId = fn(row);
    if (m.has(cardId)) dupes++;
    m.set(cardId, row.rowNum);
  }
  const missing = [];
  for (let i = 1; i <= 150; i++) if (!m.has(i)) missing.push(i);
  console.log(name, 'size=', m.size, 'dupes=', dupes, 'missing=', missing.slice(0, 5), missing.length > 5 ? `...+${missing.length - 5}` : '');
}

test('A as-is', (r) => r.a);
test('rowNum-1', (r) => r.rowNum - 1);
test('A if row<=124 else A-1', (r) => (r.rowNum <= 124 ? r.a : r.a - 1));
test('A if row<=124 else A-1 except row150=A', (r) => (r.rowNum === 150 ? r.a : r.rowNum <= 124 ? r.a : r.a - 1));
test('A if row<=124 else A-1 except row>=149=A', (r) => (r.rowNum >= 149 ? r.a : r.rowNum <= 124 ? r.a : r.a - 1));
test('sequential index', (r) => dataRows.indexOf(r) + 1);
test('A minus count of prior gaps', (r) => {
  let id = r.a;
  if (r.a > 124) id -= 1;
  return id;
});
