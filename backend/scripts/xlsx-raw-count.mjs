import XLSX from 'xlsx';
import path from 'node:path';

const wb = XLSX.readFile(path.join('data', 'arada.xlsx'));
const sheet = wb.Sheets.Sheet1;
console.log('!ref:', sheet['!ref']);

const range = XLSX.utils.decode_range(sheet['!ref']);
console.log('Range rows:', range.s.r, 'to', range.e.r, '=', range.e.r - range.s.r + 1);

// Raw array of arrays including header
const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
console.log('AOA length:', aoa.length);
console.log('Row 0 (header):', aoa[0]?.slice(0, 5));
console.log('Row 1:', aoa[1]?.slice(0, 5));
console.log('Row 148:', aoa[148]?.slice(0, 5));
console.log('Row 149:', aoa[149]?.slice(0, 5));

// Count non-empty data rows (excluding header)
let dataRows = 0;
for (let i = 1; i < aoa.length; i++) {
  if (aoa[i] && aoa[i][0] != null) dataRows++;
}
console.log('Non-empty data rows:', dataRows);
