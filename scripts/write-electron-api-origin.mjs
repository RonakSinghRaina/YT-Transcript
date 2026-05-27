import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../lib/loadEnv.cjs');

const root = process.cwd();

function readViteTranscriptApi(filePath) {
  if (!fs.existsSync(filePath)) return '';
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_TRANSCRIPT_API=')) {
      return trimmed.slice('VITE_TRANSCRIPT_API='.length).trim();
    }
  }
  return '';
}

const apiUrl =
  readViteTranscriptApi(path.join(root, '.env.desktop'))
  || readViteTranscriptApi(path.join(root, '.env'))
  || process.env.VITE_TRANSCRIPT_API
  || '';
let origin = '';
try {
  origin = apiUrl ? new URL(apiUrl).origin : '';
} catch {
  origin = '';
}

const outPath = path.join(root, 'electron', 'api-origin.txt');
if (origin && !origin.includes('your-app')) {
  fs.writeFileSync(outPath, `${origin}\n`);
  console.log('Wrote electron/api-origin.txt →', origin);
} else {
  console.warn('No VITE_TRANSCRIPT_API in .env.desktop — packaged desktop needs it for Generate.');
}
