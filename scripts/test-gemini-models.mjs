import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../lib/loadEnv.cjs');

loadEnvFile(process.cwd());
const key = process.env.GEMINI_API_KEY?.trim();
if (!key) {
  console.log('GEMINI_API_KEY missing');
  process.exit(1);
}

for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with only: OK' }] }] }),
  });
  const p = await r.json();
  console.log(model, r.status, p.error?.message?.slice(0, 100) || p.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
}
