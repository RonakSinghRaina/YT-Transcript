/**
 * Transcript/summary APIs run on a server (Vite dev middleware or Vercel).
 * GitHub Pages is static only — set VITE_TRANSCRIPT_API at build time to your Vercel URL.
 */
export function resolveTranscriptApi() {
  const custom = String(import.meta.env.VITE_TRANSCRIPT_API || '').trim();
  if (custom) {
    return custom.replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    return '/api/transcript';
  }

  return null;
}

export function resolveSummaryApi() {
  const transcriptApi = resolveTranscriptApi();
  if (!transcriptApi) return null;
  if (transcriptApi.endsWith('/transcript')) {
    return transcriptApi.replace(/\/transcript$/, '/summary');
  }
  return `${transcriptApi}/summary`;
}

export const PRODUCTION_API_SETUP_HINT =
  'GitHub Pages cannot run the transcript API. Deploy this repo to Vercel (free), add APIFY_TOKEN and other server env vars there, then add GitHub secret VITE_TRANSCRIPT_API = https://YOUR-APP.vercel.app/api/transcript and redeploy Pages.';
