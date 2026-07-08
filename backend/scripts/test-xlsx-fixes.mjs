import XLSX from 'xlsx';
import path from 'node:path';

const xlsxPath = path.join('data', 'arada.xlsx');
const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

function testFix(name, fixFn) {
  const fixed = rows.map((r) => ({ ...r, cardId: fixFn(r.cardId) }));
  const ids = fixed.map((r) => r.cardId);
  const missing = [];
  for (let i = 1; i <= 150; i++) if (!ids.includes(i)) missing.push(i);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  console.log(name, 'count', ids.length, 'unique', new Set(ids).size, 'missing', missing, 'dupes', [...new Set(dupes)]);
}

testFix('fix 125 only', (id) => (id === 125 ? 124 : id));
testFix('fix 125 + dec 126-149', (id) => {
  if (id === 125) return 124;
  if (id >= 126 && id <= 149) return id - 1;
  return id;
});
testFix('fix 125 + dec 126-148', (id) => {
  if (id === 125) return 124;
  if (id >= 126 && id <= 148) return id - 1;
  return id;
});
testFix('dec all >124', (id) => (id > 124 ? id - 1 : id));
testFix('dec all >=125', (id) => (id >= 125 ? id - 1 : id));
testFix('sequential', (id, i) => i + 1);

// sequential with index
const seq = rows.map((r, i) => i + 1);
const missing = [];
for (let i = 1; i <= 150; i++) if (!seq.includes(i)) missing.push(i);
console.log('sequential by order missing', missing);
