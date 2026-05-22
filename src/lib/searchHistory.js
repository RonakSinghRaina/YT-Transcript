export function searchHistoryItems(history, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  return (history || []).filter((item) => {
    const title = (item.title || '').toLowerCase();
    const transcript = (item.transcript || '').toLowerCase();
    const videoId = (item.video_id || '').toLowerCase();
    return title.includes(q) || transcript.includes(q) || videoId.includes(q);
  });
}

export function excerptMatch(text, query, maxLen = 120) {
  const lower = String(text || '').toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return (text || '').slice(0, maxLen);
  const start = Math.max(0, idx - 40);
  return `${start > 0 ? '…' : ''}${text.slice(start, start + maxLen)}…`;
}
