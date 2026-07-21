import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from 'node:test';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const testFiles = process.argv.slice(2);

if (testFiles.length === 0) {
  console.error('Usage: node scripts/run-node-tests.mjs <test-file> [...]');
  process.exit(1);
}

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.js'),
  logLevel: 'error',
});

try {
  for (const testFile of testFiles) {
    const relativePath = path.relative(root, path.resolve(root, testFile)).replace(/\\/g, '/');
    const modulePath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    await server.ssrLoadModule(modulePath);
  }

  const stream = run({ files: [], processExit: false });
  let failed = 0;

  for await (const event of stream) {
    if (event.type === 'test:fail') {
      failed += 1;
    }
  }

  await server.close();
  process.exit(failed > 0 ? 1 : 0);
} catch (error) {
  await server.close();
  console.error(error);
  process.exit(1);
}
