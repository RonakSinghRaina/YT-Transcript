import { loadEnvFile } from '../lib/loadEnv.cjs';
import { normalizeYouTubeInput, generateTranscript } from '../lib/transcript.mjs';

loadEnvFile(process.cwd());

const videoUrl = process.argv[2] || 'https://www.youtube.com/watch?v=BE_oJD5n-6k';
const token = process.argv[3];

console.log('normalize:', normalizeYouTubeInput(videoUrl));
console.log('APIFY_TOKEN set:', Boolean(process.env.APIFY_TOKEN));
console.log('SUPABASE_URL:', process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '(fallback)');

if (!token) {
  console.log('\nPass a Supabase access token as 2nd arg to test full flow.');
  process.exit(0);
}

try {
  const result = await generateTranscript({ accessToken: token, videoUrl });
  console.log('OK:', result.transcript?.title, 'chars:', result.transcript?.transcript?.length);
} catch (error) {
  console.error('FAIL:', error.message);
  console.error('status:', error.status);
  if (error.details) console.error('details:', error.details);
}
