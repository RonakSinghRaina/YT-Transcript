import { fetchTranscriptFromYouTubeCaptions } from '../lib/youtubeCaptions.mjs';

const videoId = process.argv[2] || 'jNQXAC9IVRw';
const result = await fetchTranscriptFromYouTubeCaptions(videoId, { language: null, includeTimestamps: true });
console.log('result:', result ? { title: result.item.title, len: result.transcriptText.length } : null);
