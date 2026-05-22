import { generateTranscript } from '../lib/transcript.mjs';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const token = getBearerToken(req);
    const body = await readBody(req);
    const payload = await generateTranscript({
      accessToken: token,
      videoUrl: body.videoUrl,
      includeTimestamps: body.includeTimestamps ?? true,
      language: body.language ?? null,
      summaryLength: body.summaryLength || 'medium',
      autoSummary: body.autoSummary !== false,
    });
    json(res, 200, payload);
  } catch (error) {
    const status = error.status || 400;
    json(res, status, { error: error.message || 'Something went wrong.' });
  }
}
