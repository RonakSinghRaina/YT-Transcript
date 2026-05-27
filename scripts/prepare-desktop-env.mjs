/**
 * Ensures .env.desktop exists with VITE_* vars for `vite build --mode desktop`.
 * Never overwrites a real VITE_TRANSCRIPT_API you already saved in .env.desktop.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const desktopPath = path.join(root, '.env.desktop');
const examplePath = path.join(root, '.env.desktop.example');
const envPath = path.join(root, '.env');

function parseViteVars(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!trimmed.startsWith('VITE_')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return map;
}

function isPlaceholder(key, value) {
  const v = String(value || '').toLowerCase();
  if (!v) return true;
  if (key === 'VITE_TRANSCRIPT_API' && (v.includes('your-app') || v.includes('your-vercel'))) {
    return true;
  }
  if (v.includes('your-project') || v.includes('your-supabase')) return true;
  return false;
}

function mergeVars(target, source) {
  for (const [k, v] of source) {
    if (isPlaceholder(k, v)) continue;
    target.set(k, v);
  }
}

const vars = new Map();
mergeVars(vars, parseViteVars(examplePath));
mergeVars(vars, parseViteVars(envPath));
// User edits in .env.desktop win (e.g. your real Vercel URL)
mergeVars(vars, parseViteVars(desktopPath));
vars.set('VITE_IS_DESKTOP', 'true');

const lines = [
  '# Desktop build env — used by: npm run build:desktop / dist:win',
  '# Edit VITE_TRANSCRIPT_API below; npm run build:desktop will NOT erase a real URL.',
  ...[...vars.entries()].map(([k, v]) => `${k}=${v}`),
];

fs.writeFileSync(desktopPath, `${lines.join('\n')}\n`);

const api = vars.get('VITE_TRANSCRIPT_API') || '';
if (!api || isPlaceholder('VITE_TRANSCRIPT_API', api)) {
  console.warn(
    'Warning: Set VITE_TRANSCRIPT_API in .env.desktop to your Vercel URL, e.g.',
    'https://yt-transcript-virid-seven.vercel.app/api/transcript',
  );
} else {
  console.log('Using .env.desktop — VITE_TRANSCRIPT_API is set.');
}
