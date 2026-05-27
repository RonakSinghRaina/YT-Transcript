import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../lib/loadEnv.cjs');

loadEnvFile(process.cwd());
const desktopPath = path.join(process.cwd(), '.env.desktop');
if (fs.existsSync(desktopPath)) {
  loadEnvFile(desktopPath);
}

/** Fixed port so Electron does not wait on 5173 while Vite uses another port. */
const DEV_PORT = process.env.ELECTRON_DEV_PORT || '5199';
const VITE_URL = `http://127.0.0.1:${DEV_PORT}`;
const maxWaitMs = 120000;
const pollMs = 400;

function waitForUrl(url) {
  const target = new URL(url);
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(
        { hostname: target.hostname, port: target.port, path: target.pathname, timeout: 2000 },
        (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else if (Date.now() - started > maxWaitMs) reject(new Error('Vite did not start'));
          else setTimeout(tick, pollMs);
        },
      );
      req.on('error', () => {
        if (Date.now() - started > maxWaitMs) {
          reject(new Error(`Timed out waiting for Vite at ${url}`));
        } else {
          setTimeout(tick, pollMs);
        }
      });
    };
    tick();
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true, env: process.env });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
    child.on('error', reject);
  });
}

let viteProc = null;
let electronProc = null;

const shutdown = () => {
  if (electronProc) electronProc.kill();
  if (viteProc) viteProc.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`TubeScribe desktop dev → ${VITE_URL}`);
console.log('Tip: close other terminals running "npm run dev" if the port is busy.\n');

try {
  await run('node', ['scripts/ensure-dev-index.mjs']);

  viteProc = spawn('npx', ['vite', '--port', DEV_PORT, '--strictPort'], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  await waitForUrl(VITE_URL);
  console.log('Opening TubeScribe window…');

  electronProc = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ELECTRON_DEV: '1',
      ELECTRON_DEV_URL: VITE_URL,
    },
  });

  electronProc.on('exit', (code) => {
    if (viteProc) viteProc.kill();
    process.exit(code ?? 0);
  });
} catch (err) {
  console.error(err.message || err);
  if (viteProc) viteProc.kill();
  process.exit(1);
}
