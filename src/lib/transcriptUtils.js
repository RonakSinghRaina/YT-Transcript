import { stripTimestamps } from '../../lib/summary.mjs';

export { stripTimestamps };

export function parseTimestampToSeconds(raw) {
  const parts = String(raw || '')
    .replace(/[\[\]()]/g, '')
    .trim()
    .split(':')
    .map((p) => parseInt(p, 10));

  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

export function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const TIMESTAMP_LINE =
  /^\[?((?:\d{1,2}:)*\d{1,2}:\d{2}(?:\.\d+)?)\]?\s*[-–—]?\s*(.+)$/;

function parseTimestampedLines(text) {
  const lines = String(text || '').split(/\r?\n/);
  const segments = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(TIMESTAMP_LINE);
    if (!match) continue;

    const seconds = parseTimestampToSeconds(match[1]);
    const body = stripTimestamps((match[2] || '').trim());
    if (seconds == null || !body) continue;

    segments.push({
      id: segments.length,
      time: formatTimestamp(seconds),
      seconds,
      body,
    });
  }

  return segments.length >= 2 ? segments : null;
}

function parseInlineTimestampBlocks(text) {
  const re =
    /\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*([^\[]+?)(?=\[?\d{1,2}:\d{2}(?::\d{2})?\]?|$)/gs;
  const segments = [];
  let match;

  while ((match = re.exec(text)) !== null) {
    const h = match[3] ? parseInt(match[1], 10) : 0;
    const m = match[3] ? parseInt(match[2], 10) : parseInt(match[1], 10);
    const s = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10);
    const body = stripTimestamps((match[4] || '').trim());
    if (!body) continue;

    const seconds = h * 3600 + m * 60 + s;
    segments.push({
      id: segments.length,
      time: formatTimestamp(seconds),
      seconds,
      body,
    });
  }

  return segments.length >= 2 ? segments : null;
}

export function splitTranscriptSegments(text) {
  const cleaned = stripTimestamps(text);
  const chunks = cleaned
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (chunks.length <= 1) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const groups = [];
    for (let i = 0; i < sentences.length; i += 2) {
      groups.push(sentences.slice(i, i + 2).join(' '));
    }
    return groups.length ? groups : [cleaned].filter(Boolean);
  }

  return chunks;
}

export function segmentsWithTimestamps(text) {
  const parsed = parseTimestampedLines(text) || parseInlineTimestampBlocks(text);
  if (parsed) return parsed;

  const parts = splitTranscriptSegments(text);
  let cursor = 0;
  return parts.map((body, index) => {
    const segment = {
      id: index,
      time: formatTimestamp(cursor),
      seconds: cursor,
      body: stripTimestamps(body),
      active: index === 0,
    };
    const words = body.split(/\s+/).length;
    cursor += Math.max(8, Math.round(words / 2.5));
    return segment;
  });
}

/** Use only a stored summary from the API/DB — never synthesize on the client. */
export function resolveVideoSummary(result) {
  if (result?.summary?.overview) return result.summary;
  return null;
}
