/**
 * Vercel Edge Middleware — CORS preflight for /api/* (Electron + GitHub Pages).
 */
export const config = {
  matcher: '/api/:path*',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, accept',
  'Access-Control-Max-Age': '86400',
};

export default function middleware(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
}
