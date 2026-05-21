import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { generateTranscript } from './lib/transcript.mjs';

function transcriptApiPlugin() {
  return {
    name: 'transcript-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/transcript' || req.method !== 'POST') {
          next();
          return;
        }

        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
            const header = req.headers.authorization || '';
            const accessToken = header.startsWith('Bearer ') ? header.slice(7) : null;
            const payload = await generateTranscript({
              accessToken,
              videoUrl: body.videoUrl,
              includeTimestamps: body.includeTimestamps ?? true,
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
        req.on('error', () => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Request failed.' }));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), transcriptApiPlugin()],
    ssr: {
      external: ['ws'],
    },
  };
});
