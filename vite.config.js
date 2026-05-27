import fs from 'fs';
import path from 'path';
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
            clientTranscript: body.clientTranscript ?? null,
            clientTitle: body.clientTitle ?? null,
            clientDescription: body.clientDescription ?? null,
            captionsOnly: body.captionsOnly === true,
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

function loadMergedEnv(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const desktopPath = path.join(process.cwd(), '.env.desktop');
  if (fs.existsSync(desktopPath)) {
    Object.assign(env, loadEnv('desktop', process.cwd(), ''));
  }
  const extensionPath = path.join(process.cwd(), '.env.extension');
  if (mode === 'extension' && fs.existsSync(extensionPath)) {
    Object.assign(env, loadEnv('extension', process.cwd(), ''));
  }
  Object.assign(process.env, env);
  return env;
}

function vercelProxyTarget(apiUrl) {
  const trimmed = String(apiUrl || '').trim();
  if (!trimmed || trimmed.includes('your-app')) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadMergedEnv(mode);
  const isDesktop = mode === 'desktop';
  const isExtension = mode === 'extension';

  if (isExtension) {
    return {
      base: './',
      define: {
        'import.meta.env.VITE_IS_EXTENSION': JSON.stringify('true'),
      },
      build: {
        outDir: 'dist-extension',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            sidepanel: path.resolve(process.cwd(), 'extension/sidepanel.html'),
            background: path.resolve(process.cwd(), 'extension/background.js'),
          },
          output: {
            entryFileNames: (chunkInfo) => {
              if (chunkInfo.name === 'background') return 'background.js';
              return 'assets/[name]-[hash].js';
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      },
      plugins: [react(), tailwindcss()],
      ssr: {
        external: ['ws'],
      },
    };
  }

  const base = isDesktop ? './' : env.VITE_BASE_PATH || '/';
  const proxyTarget = vercelProxyTarget(env.VITE_TRANSCRIPT_API);
  const useVercelProxy = mode === 'development' && Boolean(proxyTarget);

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      ...(mode === 'development' && !useVercelProxy ? [transcriptApiPlugin()] : []),
    ],
    server: useVercelProxy
      ? {
          proxy: {
            '/api/transcript': { target: proxyTarget, changeOrigin: true, secure: true },
            '/api/summary': { target: proxyTarget, changeOrigin: true, secure: true },
          },
        }
      : undefined,
    ssr: {
      external: ['ws'],
    },
  };
});
