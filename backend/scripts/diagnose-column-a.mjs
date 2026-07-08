import fs from 'node:fs';

const sheet = fs.readFileSync('data/_xlsx_tmp/xl/worksheets/sheet1.xml', 'utf8');
const ids = [];

for (const match of sheet.matchAll(/<c r="A(\d+)"[^>]*><v>(\d+)<\/v>/g)) {
  ids.push({ row: Number(match[1]), id: Number(match[2]) });
}

ids.sort((a, b) => a.row - b.row);
const dup = ids.filter((x, i, a) => a.findIndex((y) => y.id === x.id) !== i);

console.log('A column entries', ids.length);
console.log('Duplicates by cardId', dup);
console.log('Rows 122-126', ids.filter((x) => x.row >= 122 && x.row <= 126));
console.log('Last 5 rows', ids.slice(-5));

// Check for rows with different cell patterns (sparse rows)
const rowMatches = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
const sparse = [];
for (const [, rowNumber, rowXml] of rowMatches) {
  const rowNum = Number(rowNumber);
  if (rowNum === 1) continue;
  const hasA = /<c r="A\d+"/.test(rowXml);
  if (!hasA) sparse.push({ rowNum, snippet: rowXml.slice(0, 100) });
}
console.log('Rows without A column:', sparse);

// Check dimension
const dim = sheet.match(/dimension ref="([^"]+)"/);
console.log('Dimension:', dim?.[1]);
