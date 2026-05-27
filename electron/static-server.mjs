import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxyToApi(req, res, apiProxyOrigin) {
  const target = new URL(req.url || '/', apiProxyOrigin);
  const transport = target.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: target.host };
  const body =
    req.method === 'GET' || req.method === 'HEAD' ? null : await collectBody(req);

  const proxyReq = transport.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', () => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Could not reach the cloud API. Check internet and Vercel env vars (APIFY_TOKEN).',
      }),
    );
  });

  if (body?.length) proxyReq.write(body);
  proxyReq.end();
}

/**
 * @param {string} rootDir
 * @param {number} [port=0]
 * @param {{ apiProxyOrigin?: string }} [options]
 */
export function startStaticServer(rootDir, port = 0, options = {}) {
  const root = path.resolve(rootDir);
  const apiProxyOrigin = options.apiProxyOrigin?.replace(/\/$/, '') || null;

  const server = http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url || '/', 'http://127.0.0.1');

      if (apiProxyOrigin && pathname.startsWith('/api/')) {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, content-type, accept',
          });
          res.end();
          return;
        }
        await proxyToApi(req, res, apiProxyOrigin);
        return;
      }

      let relative = decodeURIComponent(pathname);
      if (relative === '/') relative = '/index.html';

      const filePath = path.normalize(path.join(root, relative.replace(/^\//, '')));
      if (!filePath.startsWith(root)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const spaIndex = path.join(root, 'index.html');
        if (fs.existsSync(spaIndex)) {
          serveFile(spaIndex, res);
          return;
        }
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      serveFile(filePath, res);
    } catch {
      res.statusCode = 500;
      res.end('Server error');
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        server,
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(filePath).pipe(res);
}
