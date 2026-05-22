import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { generateTranscript } from './lib/transcript.mjs';
import { processSummaryRequest } from './api/summary.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function transcriptApiPlugin() {
  return {
    name: 'transcript-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (req.method !== 'POST' || (path !== '/api/transcript' && path !== '/api/summary')) {
          next();
          return;
        }

        if (path === '/api/summary') {
          try {
            const body = await readJsonBody(req);
            const header = req.headers.authorization || '';
            const accessToken = header.startsWith('Bearer ') ? header.slice(7) : null;
            const payload = await processSummaryRequest({ accessToken, body });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
          } catch (error) {
            res.statusCode = error.status || 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Summary request failed.' }));
          }
          return;
        }

        try {
          const body = await readJsonBody(req);
          const header = req.headers.authorization || '';
          const accessToken = header.startsWith('Bearer ') ? header.slice(7) : null;
          const payload = await generateTranscript({
            accessToken,
            videoUrl: body.videoUrl,
            includeTimestamps: body.includeTimestamps ?? true,
            language: body.language ?? null,
            summaryLength: body.summaryLength || 'medium',
            autoSummary: body.autoSummary !== false,
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = error.status || 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message || 'Something went wrong.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  // GitHub Pages serves at https://<user>.github.io/<repo-name>/
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      ...(mode === 'development' ? [transcriptApiPlugin()] : []),
    ],
    ssr: {
      external: ['ws'],
    },
  };
});
