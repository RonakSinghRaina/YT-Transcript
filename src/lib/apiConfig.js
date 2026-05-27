function isRealApiUrl(url) {
  return Boolean(url) && !url.includes('your-app') && !url.includes('your-vercel');
}

function normalizeApiUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

function isDesktopClient() {
  return (
    import.meta.env.VITE_IS_DESKTOP === 'true'
    || (typeof window !== 'undefined' && window.tubescribeDesktop)
  );
}

function isExtensionClient() {
  return import.meta.env.VITE_IS_EXTENSION === 'true';
}

/**
 * Desktop + dev use same-origin /api (Vite or Electron proxy → Vercel).
 * GitHub Pages uses the full Vercel URL baked at build time.
 */
export function resolveTranscriptApi() {
  if (isExtensionClient()) {
    const custom = normalizeApiUrl(import.meta.env.VITE_TRANSCRIPT_API);
    return isRealApiUrl(custom) ? custom : null;
  }

  if (import.meta.env.DEV || isDesktopClient()) {
    return '/api/transcript';
  }

  const custom = normalizeApiUrl(import.meta.env.VITE_TRANSCRIPT_API);
  if (isRealApiUrl(custom)) {
    return custom;
  }

  return null;
}

export const DESKTOP_API_MISSING_HINT =
  'Set VITE_TRANSCRIPT_API in .env.desktop to your Vercel URL, then run npm run build:desktop again.';

export function resolveSummaryApi() {
  const transcriptApi = resolveTranscriptApi();
  if (!transcriptApi) return null;
  if (transcriptApi === '/api/transcript') {
    return '/api/summary';
  }
  if (transcriptApi.endsWith('/transcript')) {
    return transcriptApi.replace(/\/transcript$/, '/summary');
  }
  return `${transcriptApi}/summary`;
}

export const EXTENSION_API_MISSING_HINT =
  'Set VITE_TRANSCRIPT_API in .env.extension to your Vercel URL, then run npm run build:extension.';

export const PRODUCTION_API_SETUP_HINT = isExtensionClient()
  ? EXTENSION_API_MISSING_HINT
  : isDesktopClient()
    ? DESKTOP_API_MISSING_HINT
    : 'GitHub Pages cannot run the transcript API. Deploy to Vercel and set VITE_TRANSCRIPT_API in GitHub Actions secrets.';
