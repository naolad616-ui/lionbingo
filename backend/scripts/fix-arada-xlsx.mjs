import XLSX from 'xlsx';
import path from 'node:path';

const xlsxPath = path.join('data', 'arada.xlsx');
const wb = XLSX.readFile(xlsxPath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

let changed = 0;
for (const row of rows) {
  if (row.cardId === 125) {
    row.cardId = 124;
    changed += 1;
  }
}

if (changed === 0) {
  console.log('No cardId 125 rows found; workbook may already be fixed.');
} else {
  const nextSheet = XLSX.utils.json_to_sheet(rows, { header: Object.keys(rows[0]) });
  wb.Sheets[sheetName] = nextSheet;
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Updated ${changed} row(s): cardId 125 -> 124`);
}

const cardIds = rows.map((r) => r.cardId);
const missing = [];
for (let i = 1; i <= 150; i += 1) {
  if (!cardIds.includes(i)) missing.push(i);
}
console.log('cardIds after fix:', cardIds.length, 'unique', new Set(cardIds).size, 'missing', missing);
