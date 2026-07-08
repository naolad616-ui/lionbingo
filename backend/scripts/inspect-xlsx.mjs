import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('data');
const tmp = path.join(root, '_xlsx_tmp');
const xlsxPath = path.join(root, 'arada.xlsx');

if (!fs.existsSync(tmp)) {
  fs.mkdirSync(tmp, { recursive: true });
  execSync(`tar -xf "${xlsxPath}" -C "${tmp}"`, { stdio: 'pipe' });
}

const ss = fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8');
const items = [...ss.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);

const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

function parseRow(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  return cells.map((c) => ({
    col: c[1],
    val: c[3].includes('t="s"') ? items[Number(c[4])] : c[4],
  }));
}

for (let i = 1; i <= 3; i += 1) {
  console.log('row', rows[i][1], parseRow(rows[i][2]));
}
