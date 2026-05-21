import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../lib/loadEnv.cjs');

loadEnvFile(process.cwd());

const token = process.env.APIFY_TOKEN;
const actorPath = (process.env.APIFY_ACTOR_ID || 'prodiger/youtube-transcript-scraper---transcriber').replace('/', '~');
const apifyUrl = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=300`;

for (const transcriptMethod of ['captions', 'auto', 'whisper']) {
  console.log('\n--- method:', transcriptMethod, '---');
  const response = await fetch(apifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoUrls: ['https://www.youtube.com/watch?v=BE_oJD5n-6k'],
      preferredLanguage: 'en',
      transcriptMethod,
      outputFormat: 'text',
      includeTimestamps: false,
      openaiApiKey: process.env.OPENAI_API_KEY || 'placeholder',
    }),
  });
  const items = await response.json();
  const first = Array.isArray(items) ? items[0] : items;
  console.log('status', response.status, 'skipReason', first?.skipReason, 'transcript len', (first?.transcript || '').length);
}
