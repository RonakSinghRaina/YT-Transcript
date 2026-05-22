import { loadPrefs } from './prefs.js';

export function getSummaryApiUrl() {
  const base = import.meta.env.VITE_TRANSCRIPT_API || '/api/transcript';
  return base.replace(/\/transcript\/?$/, '/summary');
}

export async function fetchVideoSummary({
  accessToken,
  transcriptId,
  transcript,
  title,
  summaryLength,
  autoSummary = true,
  force = false,
}) {
  const prefs = loadPrefs();
  const response = await fetch(getSummaryApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      transcriptId,
      transcript,
      title,
      summaryLength: summaryLength || prefs.summaryLength,
      autoSummary: autoSummary ?? prefs.autoSummary,
      force,
    }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Summary server error (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Could not generate summary.');
  }

  return payload.summary || null;
}
