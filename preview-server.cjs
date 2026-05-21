const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnvFile } = require('./lib/loadEnv.cjs');

const root = process.cwd();
const port = Number(process.env.PORT || 8080);

loadEnvFile(root);

async function handleTranscriptApi(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const header = req.headers.authorization || '';
    const accessToken = header.startsWith('Bearer ') ? header.slice(7) : null;
    const { generateTranscript } = await import('./lib/transcript.mjs');
    const payload = await generateTranscript({
      accessToken,
      videoUrl: body.videoUrl,
      includeTimestamps: body.includeTimestamps ?? true,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  } catch (error) {
    res.writeHead(error.status || 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message || 'Something went wrong.' }));
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/transcript' && req.method === 'POST') {
    await handleTranscriptApi(req, res);
    return;
  }

  const pathname = url.pathname === '/' ? '/preview.html' : url.pathname;
  const file = path.join(root, decodeURIComponent(pathname));

  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const contentType = pathname.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : pathname.endsWith('.css')
        ? 'text/css; charset=utf-8'
        : pathname.endsWith('.js')
          ? 'text/javascript; charset=utf-8'
          : 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview server ready at http://127.0.0.1:${port}/`);
});
