// YouTube captions are now tried in fetchTranscriptText() before this function is called.

const SKIP_REASON_PRIORITY = {
  'video-unavailable': 100,
  'over-duration-cap': 95,
  'live-stream': 90,
  'audio-download-failed': 80,
  'audio-exceeds-whisper-limit': 75,
  'whisper-budget-exceeded': 70,
  'no-openai-key-no-fallback': 65,
  'no-captions': 10,
};

function pickTranscript(item) {
  if (!item || typeof item !== 'object') return '';
  if (typeof item.transcript === 'string') return item.transcript;
  if (typeof item.text === 'string') return item.text;
  if (typeof item.transcript_text === 'string') return item.transcript_text;
  if (typeof item.transcriptText === 'string') return item.transcriptText;
  if (typeof item.transcript_llm === 'string') return item.transcript_llm;
  if (Array.isArray(item.segments)) {
    return item.segments.map((segment) => segment.text || segment.caption || '').filter(Boolean).join(' ');
  }
  return '';
}

export function getTrimmedOpenAiKey() {
  const raw = String(process.env.OPENAI_API_KEY || '').trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

export function hasRealOpenAiKey() {
  const key = getTrimmedOpenAiKey();
  return Boolean(key && key !== 'placeholder' && key.length > 10);
}

function skipReasonPriority(reason) {
  if (!reason) return 0;
  if (reason.startsWith('whisper-api-error')) return 85;
  return SKIP_REASON_PRIORITY[reason] ?? 50;
}

function shouldReplaceSkipReason(current, next) {
  if (!next) return false;
  if (!current) return true;
  return skipReasonPriority(next) > skipReasonPriority(current);
}

/** Human-readable errors instead of raw Apify skip codes. */
export function formatSkipReason(skipReason, { hasOpenAi, preferredLanguage } = {}) {
  const lang = preferredLanguage || 'en';
  switch (skipReason) {
    case 'no-captions':
      if (hasOpenAi) {
        return `No captions were found for this video (tried ${lang}). Whisper fallback was attempted but did not return a transcript — the video may be private, region-locked, or have no usable audio. Enable captions on YouTube or try again later.`;
      }
      return `This video has no captions in ${lang}. Add OPENAI_API_KEY to your server .env to enable automatic audio transcription (Whisper), or pick another language in Settings → Transcription.`;
    case 'no-openai-key-no-fallback':
      return 'This video has no captions. Add OPENAI_API_KEY to your .env (Vercel/local server) so TubeScribe can transcribe the audio with Whisper.';
    case 'video-unavailable':
      return 'This YouTube video is unavailable (private, deleted, or restricted).';
    case 'live-stream':
      return 'Live streams cannot be transcribed until the broadcast ends.';
    case 'whisper-budget-exceeded':
      return 'Whisper transcription budget was exceeded for this run. Try again later or use a shorter video.';
    case 'audio-download-failed':
      return 'Could not download audio from YouTube for Whisper transcription. Try again in a few minutes.';
    case 'audio-exceeds-whisper-limit':
      return 'This video is too long for a single Whisper request. Try a shorter video or enable captions on YouTube.';
    default:
      if (skipReason?.startsWith('whisper-api-error:401')) {
        return 'OpenAI API key is invalid. Check OPENAI_API_KEY in your server environment.';
      }
      if (skipReason?.startsWith('whisper-api-error:402')) {
        return 'OpenAI account has insufficient quota for Whisper transcription.';
      }
      if (skipReason?.startsWith('whisper-api-error:429')) {
        return 'OpenAI rate limit hit. Wait a moment and try again.';
      }
      if (skipReason?.startsWith('whisper-api-error:')) {
        return `Whisper transcription failed (${skipReason}). Check your OpenAI key and billing.`;
      }
      return skipReason || 'No transcript was returned for this video.';
  }
}

function buildMethodChain(configuredMethod, hasOpenAi) {
  const method = (configuredMethod || 'auto').toLowerCase();

  if (method === 'whisper') {
    return hasOpenAi ? ['whisper', 'auto', 'captions'] : ['captions'];
  }
  if (method === 'captions') {
    return hasOpenAi ? ['captions', 'auto', 'whisper'] : ['captions'];
  }
  // auto (default): captions first inside actor, then Whisper when key present
  return hasOpenAi ? ['auto', 'whisper', 'captions'] : ['captions', 'auto'];
}

function openaiKeyForMethod(method, hasOpenAi) {
  const key = getTrimmedOpenAiKey();
  if ((method === 'auto' || method === 'whisper') && hasOpenAi) {
    return key;
  }
  return key || 'placeholder';
}

function apifyLanguagesToTry(explicitLanguage) {
  if (explicitLanguage) return [explicitLanguage];
  const envLang = process.env.APIFY_PREFERRED_LANGUAGE?.trim();
  if (envLang && envLang !== 'auto') return [envLang];
  return ['en', 'hi', 'es', 'fr', 'de', 'pt', 'ja'];
}

export async function fetchTranscriptViaApify({
  canonicalUrl,
  videoId,
  includeTimestamps,
  language,
  maxDurationMinutes,
}) {
  const actorId = process.env.APIFY_ACTOR_ID || 'prodiger/youtube-transcript-scraper---transcriber';
  const actorPath = actorId.replace('/', '~');
  const apifyTimeout = Math.min(600, Math.max(120, maxDurationMinutes * 4));
  const apifyUrl = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?token=${encodeURIComponent(process.env.APIFY_TOKEN)}&timeout=${apifyTimeout}`;

  const hasOpenAi = hasRealOpenAiKey();
  const configuredMethod = (process.env.APIFY_TRANSCRIPT_METHOD || 'auto').toLowerCase();
  const methods = buildMethodChain(configuredMethod, hasOpenAi);
  const explicitLanguage = language?.trim() || null;
  const combinedLanguages = apifyLanguagesToTry(explicitLanguage).join(',');
  const displayLanguage = explicitLanguage || process.env.APIFY_PREFERRED_LANGUAGE || 'any available';

  // NOTE: YouTube direct captions are already tried in fetchTranscriptText()
  // with a 10s timeout. Skip the redundant attempt here and go straight to Apify.

  let lastItem = null;
  let lastSkip = null;

  for (const transcriptMethod of methods) {
    const apifyInput = {
      videoUrls: [canonicalUrl],
      transcriptMethod,
      outputFormat: 'text',
      includeTimestamps,
      maxDurationMinutes,
      openaiApiKey: openaiKeyForMethod(transcriptMethod, hasOpenAi),
      preferredLanguage: combinedLanguages,
    };

    const apifyController = new AbortController();
    const apifyFetchTimeout = setTimeout(() => apifyController.abort(), 180000);

    let apifyResponse;
    try {
      apifyResponse = await fetch(apifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apifyInput),
        signal: apifyController.signal,
      });
    } catch (fetchErr) {
      clearTimeout(apifyFetchTimeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Transcript generation timed out. The video may be too long or the server is busy — try again.');
      }
      throw fetchErr;
    }
    clearTimeout(apifyFetchTimeout);

    const apifyText = await apifyResponse.text();
    let items;
    try {
      items = JSON.parse(apifyText);
    } catch {
      items = [];
    }

    if (!apifyResponse.ok) {
      throw new Error(items?.error?.message || items?.message || 'Apify could not generate a transcript for this video.');
    }

    const firstItem = Array.isArray(items) ? items[0] : items;
    lastItem = firstItem;
    const transcriptText = pickTranscript(firstItem);

    if (transcriptText) {
      return { item: firstItem, transcriptText, methodUsed: transcriptMethod };
    }

    const skip = firstItem?.skipReason || firstItem?.error || null;
    if (shouldReplaceSkipReason(lastSkip, skip)) lastSkip = skip;
    if (lastSkip === 'over-duration-cap') break;
  }

  if (lastSkip === 'over-duration-cap') {
    const minutes = Math.ceil((lastItem?.durationSeconds || 0) / 60);
    throw new Error(
      `This video is about ${minutes} minutes, which exceeds the current limit (${maxDurationMinutes} min). Set APIFY_MAX_DURATION_MINUTES up to 300 in .env and restart the server.`,
    );
  }

  throw new Error(formatSkipReason(lastSkip, { hasOpenAi, preferredLanguage: displayLanguage }));
}
