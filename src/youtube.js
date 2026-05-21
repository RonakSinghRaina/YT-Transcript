export function getVideoId(value) {
  const input = String(value || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v') || '';
      if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/').filter(Boolean)[1] || '';
      }
    }
  } catch {
    return '';
  }
  return '';
}

export function formatTranscriptError(message) {
  if (!message || message === 'Transcript generation failed.') {
    return 'Transcript generation failed. Check that you are logged in, the dev server is running, and APIFY_TOKEN is set in .env.';
  }
  return message;
}
