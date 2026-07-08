import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('data');
const tmp = path.join(root, '_xlsx_tmp');
const xlsxPath = path.join(root, 'arada.xlsx');

if (!fs.existsSync(path.join(tmp, 'xl/worksheets/sheet1.xml'))) {
  fs.mkdirSync(tmp, { recursive: true });
  execSync(`tar -xf "${xlsxPath}" -C "${tmp}"`, { stdio: 'pipe' });
}

const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rowMatches = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

for (const [, rowNumber, rowXml] of rowMatches) {
  const rowNum = Number(rowNumber);
  if (rowNum >= 120 && rowNum <= 130) {
    console.log('--- Row', rowNum, '---');
    console.log(rowXml);
    console.log('');
  }
}
