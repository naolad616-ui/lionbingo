import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const soundsSource = path.resolve(__dirname, '../sounds');
const soundsTarget = path.resolve(__dirname, '../dist/sounds');

if (!fs.existsSync(soundsSource)) {
  console.warn('[build] sounds source folder not found:', soundsSource);
  process.exit(0);
}

fs.cpSync(soundsSource, soundsTarget, { recursive: true });
console.log('[build] Copied sounds to', soundsTarget);
