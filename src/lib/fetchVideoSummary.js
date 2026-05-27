import { loadPrefs } from './prefs.js';
import { resolveSummaryApi } from './apiConfig.js';

export function getSummaryApiUrl() {
  return resolveSummaryApi() || '/api/summary';
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
  const url = getSummaryApiUrl();
  if (!url) {
    throw new Error('Summary API is not configured. Set VITE_TRANSCRIPT_API and redeploy or rebuild.');
  }

  let response;
  try {
    response = await fetch(url, {
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
  } catch {
    throw new Error(
      'Could not reach the summary server. Check your connection and that Vercel has GEMINI_API_KEY set.',
    );
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Summary server error (${response.status}).`);
  }

  if (!response.ok) {
    const msg = payload.error || 'Could not generate summary.';
    if (msg.includes('supabaseUrl is required')) {
      throw new Error('Summary server needs a redeploy. Redeploy Vercel with the latest code.');
    }
    throw new Error(msg);
  }

  return payload.summary || null;
}
