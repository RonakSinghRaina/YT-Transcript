import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../lib/loadEnv.cjs');

loadEnvFile(process.cwd());

const token = process.env.APIFY_TOKEN;
const actorPath = (process.env.APIFY_ACTOR_ID || 'prodiger/youtube-transcript-scraper---transcriber').replace('/', '~');
const apifyUrl = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=120`;

const apifyInput = {
  videoUrls: ['https://www.youtube.com/watch?v=BE_oJD5n-6k'],
  preferredLanguage: 'en',
  transcriptMethod: 'captions',
  outputFormat: 'text',
  includeTimestamps: true,
  openaiApiKey: process.env.OPENAI_API_KEY || 'placeholder',
};

console.log('Calling Apify...');
const response = await fetch(apifyUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apifyInput),
});

const text = await response.text();
console.log('HTTP', response.status);
console.log(text.slice(0, 4000));
