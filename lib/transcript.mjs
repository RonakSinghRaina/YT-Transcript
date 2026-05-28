import { createServerSupabase } from './supabaseServer.mjs';
import { fetchTranscriptViaApify } from './apifyTranscript.mjs';
import { fetchTranscriptFromYouTubeCaptions } from './youtubeCaptions.mjs';
import { buildVideoSummary } from './summary.mjs';
import { resolveServerSupabaseCredentials } from './supabaseConfig.mjs';

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function normalizeYouTubeInput(value) {
  const input = String(value || '').trim();
  if (!input) throw new Error('Paste a YouTube link or video ID.');
  if (YOUTUBE_ID_PATTERN.test(input)) {
    return { videoId: input, videoUrl: `https://www.youtube.com/watch?v=${input}` };
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error('That does not look like a valid YouTube link or 11-character video ID.');
  }

  const host = url.hostname.replace(/^www\./, '');
  let videoId = '';

  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (host.endsWith('youtube.com')) {
    if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
    if (!videoId && (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/'))) {
      videoId = url.pathname.split('/').filter(Boolean)[1] || '';
    }
  }

  if (!YOUTUBE_ID_PATTERN.test(videoId)) {
    throw new Error('Please use a standard YouTube video, Shorts, share link, embed link, or bare video ID.');
  }

  return { videoId, videoUrl: `https://www.youtube.com/watch?v=${videoId}` };
}

function pickTitle(item, fallbackVideoId, override) {
  return override || item?.title || item?.videoTitle || item?.metadata?.title || `YouTube video ${fallbackVideoId}`;
}

function pickDescription(item, override) {
  return override || item?.description || item?.videoDescription || item?.metadata?.description || '';
}

async function assertUserAccess(supabase, user) {
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

async function fetchTranscriptText({
  videoId,
  canonicalUrl,
  includeTimestamps,
  language,
  clientTranscript,
  clientTitle,
  clientDescription,
  captionsOnly = false,
}) {
  if (clientTranscript?.trim()) {
    return {
      item: {
        videoId,
        title: clientTitle || `YouTube video ${videoId}`,
        description: clientDescription || '',
        transcriptMethod: 'client',
      },
      transcriptText: clientTranscript.trim(),
      methodUsed: 'client',
    };
  }

  // YouTube direct captions: try quickly, fall back to Apify if it takes too long.
  // YouTube's anti-bot measures (PoToken requirement) often cause direct fetches to
  // return empty content from server-side environments, so we cap this at 10s.
  try {
    const direct = await Promise.race([
      fetchTranscriptFromYouTubeCaptions(videoId, { language, includeTimestamps }),
      new Promise((resolve) => setTimeout(() => resolve(null), 40000)),
    ]);
    if (direct?.transcriptText) return direct;
  } catch {
    // YouTube captions failed — continue to Apify
  }

  if (captionsOnly || !process.env.APIFY_TOKEN) {
    const error = new Error(
      'No captions found for this video. On YouTube, open ⋯ → Show transcript, refresh the page, then try again.',
    );
    error.status = 422;
    throw error;
  }

  const maxDurationMinutes = Math.min(
    300,
    Math.max(1, Number(process.env.APIFY_MAX_DURATION_MINUTES || 120)),
  );
  return fetchTranscriptViaApify({
    canonicalUrl,
    videoId,
    includeTimestamps,
    language,
    maxDurationMinutes,
  });
}

export async function generateTranscript({
  accessToken,
  videoUrl,
  clientTranscript = null,
  clientTitle = null,
  clientDescription = null,
  captionsOnly = false,
  includeTimestamps = true,
  language = null,
  summaryLength = 'medium',
  autoSummary = true,
} = {}) {
  if (!accessToken) {
    const error = new Error('Please log in before generating a transcript.');
    error.status = 401;
    throw error;
  }

  const { supabaseUrl, supabaseAnonKey } = resolveServerSupabaseCredentials();
  const supabase = createServerSupabase(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userResult?.user) {
    const error = new Error('Your session expired. Please log in again.');
    error.status = 401;
    throw error;
  }

  const user = userResult.user;
  const { videoId, videoUrl: canonicalUrl } = normalizeYouTubeInput(videoUrl);
  await assertUserAccess(supabase, user);

  const { item: firstItem, transcriptText } = await fetchTranscriptText({
    videoId,
    canonicalUrl,
    includeTimestamps,
    language,
    clientTranscript,
    clientTitle,
    clientDescription,
    captionsOnly,
  });

  const title = pickTitle(firstItem, videoId, clientTitle);
  const description = pickDescription(firstItem, clientDescription);

  let summary = null;
  if (autoSummary) {
    try {
      summary = await buildVideoSummary(transcriptText, {
        length: summaryLength,
        enabled: true,
        title,
        description,
      });
    } catch (error) {
      console.error('[summary] Skipped during transcript save:', error.message);
    }
  }

  const { data: saved, error: saveError } = await supabase
    .from('transcript_history')
    .insert({
      user_id: user.id,
      video_url: canonicalUrl,
      video_id: videoId,
      title,
      transcript: transcriptText,
      actor_run_id: firstItem?.runId || firstItem?.apifyRunId || firstItem?.transcriptMethod || null,
    })
    .select('*')
    .single();

  if (saveError) throw saveError;

  if (summary) {
    try {
      const { data: withSummary } = await supabase
        .from('transcript_history')
        .update({ summary })
        .eq('id', saved.id)
        .select('*')
        .single();
      if (withSummary) Object.assign(saved, withSummary);
    } catch (err) {
      console.error('[transcript] Could not save summary to database:', err.message);
    }
  }

  return {
    transcript: saved,
    summary,
    trialEndsAt: null,
    credits: 'unlimited',
  };
}
