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

console.log('Total row elements:', rows.length);
console.log('Row numbers:', rows.map((m) => Number(m[1])).join(', '));

for (const n of [1, 2, 3, 123, 124, 125, 149, 150]) {
  const row = rows.find((m) => Number(m[1]) === n);
  if (!row) {
    console.log('Row', n, 'NOT FOUND');
    continue;
  }
  const v = parseRow(row[2]);
  console.log('Row', n, 'A=', v.A, 'expectedCardByPos=', n - 1, 'B=', v.B, 'N=', v.N);
}

const wb = fs.readFileSync(path.join(tmp, 'xl/workbook.xml'), 'utf8');
console.log('Sheets:', [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));
