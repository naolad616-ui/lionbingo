import XLSX from 'xlsx';
import path from 'node:path';

const xlsxPath = path.join('data', 'arada.xlsx');
const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const json = XLSX.utils.sheet_to_json(sheet, { defval: null });

console.log('Sheet names:', wb.SheetNames);
console.log('JSON rows:', json.length);
console.log('First row keys:', Object.keys(json[0] || {}));
console.log('First row:', json[0]);
console.log('Last row:', json[json.length - 1]);

const cardIds = json.map((r) => r.cardId).filter((v) => v != null);
console.log('cardId count:', cardIds.length);
console.log('Unique cardIds:', new Set(cardIds).size);

const missing = [];
for (let i = 1; i <= 150; i++) {
  if (!cardIds.includes(i)) missing.push(i);
}
console.log('Missing cardIds:', missing);

const dupes = cardIds.filter((id, i) => cardIds.indexOf(id) !== i);
console.log('Duplicate cardIds:', [...new Set(dupes)]);
