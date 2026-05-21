import { buildHeuristicSummary, stripTimestamps } from '../../lib/summary.mjs';

export { stripTimestamps, buildHeuristicSummary };

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

export function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function segmentsWithTimestamps(text) {
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

export function resolveVideoSummary(result) {
  if (result?.summary?.sections?.length) return result.summary;
  if (result?.transcript) return buildHeuristicSummary(result.transcript);
  return null;
}
