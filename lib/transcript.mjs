import { createServerSupabase } from './supabaseServer.mjs';
import { fetchTranscriptViaApify } from './apifyTranscript.mjs';
import { buildVideoSummary } from './summary.mjs';

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const PUBLIC_SUPABASE_URL = 'https://xtkdvqyhkzhpgubqmbcu.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0a2R2cXloa3pocGd1YnFtYmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQwOTQsImV4cCI6MjA5NDczMDA5NH0.RGakZyUYHMFiZX0XNIBGRmoaoykhkCWMydipoJugt-w';

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

function pickTitle(item, fallbackVideoId) {
  return item?.title || item?.videoTitle || item?.metadata?.title || `YouTube video ${fallbackVideoId}`;
}

function pickDescription(item) {
  return item?.description || item?.videoDescription || item?.metadata?.description || '';
}

export async function generateTranscript({
  accessToken,
  videoUrl,
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY;
  if (!process.env.APIFY_TOKEN) {
    const error = new Error('APIFY_TOKEN is missing. Add it to your .env file for local preview.');
    error.status = 500;
    throw error;
  }

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

  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
  }, { onConflict: 'id', ignoreDuplicates: true });

  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_started_at')
    .eq('id', user.id)
    .maybeSingle();

  const trialStart = profile?.trial_started_at ? new Date(profile.trial_started_at) : new Date();
  const trialEndsAt = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const trialActive = Date.now() < trialEndsAt.getTime();

  if (!trialActive) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
      .from('transcript_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfToday.toISOString());

    if (countError) throw countError;
    if ((count || 0) >= 1) {
      const error = new Error('Your free daily credit is used. The unlimited 7-day offer is available for new accounts.');
      error.status = 402;
      throw error;
    }
  }

  const maxDurationMinutes = Math.min(300, Math.max(1, Number(process.env.APIFY_MAX_DURATION_MINUTES || 120)));
  const { item: firstItem, transcriptText } = await fetchTranscriptViaApify({
    canonicalUrl,
    videoId,
    includeTimestamps,
    language,
    maxDurationMinutes,
  });

  const title = pickTitle(firstItem, videoId);
  const description = pickDescription(firstItem);

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
      actor_run_id: firstItem?.runId || firstItem?.apifyRunId || null,
    })
    .select('*')
    .single();

  if (saveError) throw saveError;

  if (summary) {
    const { data: withSummary } = await supabase
      .from('transcript_history')
      .update({ summary })
      .eq('id', saved.id)
      .select('*')
      .single();
    if (withSummary) Object.assign(saved, withSummary);
  }

  return {
    transcript: saved,
    summary,
    trialEndsAt: trialEndsAt.toISOString(),
    credits: trialActive ? 'unlimited' : 0,
  };
}
