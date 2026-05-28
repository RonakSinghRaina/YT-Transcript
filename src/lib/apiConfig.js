function isRealApiUrl(url) {
  return Boolean(url) && !url.includes('your-app') && !url.includes('your-vercel');
}

function normalizeApiUrl(url) {
  let trimmed = String(url || '').trim().replace(/\/$/, '');
  if (trimmed && !trimmed.endsWith('/transcript') && !trimmed.includes('your-app')) {
    if (trimmed.endsWith('/api')) {
      trimmed += '/transcript';
    } else {
      trimmed += '/api/transcript';
    }
  }
  return trimmed;
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

function isVercelDeployment() {
  // Vercel sets VERCEL=1 at build time; we expose it via VITE_ prefix
  if (import.meta.env.VITE_IS_VERCEL === 'true') return true;
  // Runtime detection: Vercel deployments use *.vercel.app or custom domains
  // but always have the /api serverless functions available on the same origin
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.vercel.app')) return true;
  }
  return false;
}

function isGitHubPages() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return host.endsWith('.github.io');
  }
  return false;
}

/**
 * Desktop + dev + Vercel use same-origin /api (Vite or serverless).
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

  // Explicit API URL always wins (e.g. GitHub Pages pointing to Vercel)
  const custom = normalizeApiUrl(import.meta.env.VITE_TRANSCRIPT_API);
  if (isRealApiUrl(custom)) {
    return custom;
  }

  // On Vercel deployments, the serverless /api functions live on the same origin
  if (isVercelDeployment()) {
    return '/api/transcript';
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
