const ALLOWED_HEADERS = 'authorization, content-type, accept';

/**
 * Apply CORS for browser, GitHub Pages, and Electron (127.0.0.1) clients.
 * @returns {boolean} true if OPTIONS preflight was handled (caller should return)
 */
export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}
