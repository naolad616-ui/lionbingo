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

const sharedStrings = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
const rowMatches = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

const byCardId = new Map();

for (const [, rowNumber, rowXml] of rowMatches) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;

  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><v>([^<]*)<\/v>/g)];
  const rowValues = {};
  for (const [, column, , attrs, rawValue] of cells) {
    rowValues[column] = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] : rawValue;
  }

  const cardId = Number(rowValues.A);
  byCardId.set(cardId, { rowNum, rowValues });
}

console.log('All cardIds found:', [...byCardId.keys()].sort((a, b) => a - b));
console.log('Count:', byCardId.size);

for (let id = 1; id <= 150; id += 1) {
  if (!byCardId.has(id)) console.log('Missing cardId', id);
}

// Check if row 125 exists as separate element - maybe row 124 in sheet is empty?
console.log('Row 125 cardId:', byCardId.get(125)?.rowNum);

// List rows where cardId != rowNum - 1
for (const [cardId, { rowNum }] of byCardId.entries()) {
  if (cardId !== rowNum - 1) {
    console.log('Mismatch: row', rowNum, 'has cardId', cardId);
  }
}
