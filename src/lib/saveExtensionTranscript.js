import { applyTranscriptionPrefs } from './processTranscript.js';
import { fetchVideoSummary } from './fetchVideoSummary.js';
import { getVideoId } from '../youtube.js';

function canonicalWatchUrl(videoUrl, videoId) {
  const id = videoId || getVideoId(videoUrl);
  if (!id) throw new Error('Invalid YouTube URL.');
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Extension path: captions are fetched in-browser; save directly to Supabase.
 * Avoids Vercel /api/transcript and Apify/Whisper entirely.
 */
export async function saveExtensionTranscript({
  supabase,
  session,
  videoUrl,
  transcriptText,
  title,
  prefs,
}) {
  if (!session?.user?.id) throw new Error('Please log in.');
  if (!transcriptText?.trim()) {
    throw new Error(
      'No captions found. On YouTube, open ⋯ → Show transcript, refresh the page, then try again.',
    );
  }

  const videoId = getVideoId(videoUrl);
  const canonicalUrl = canonicalWatchUrl(videoUrl, videoId);
  const processed = applyTranscriptionPrefs(transcriptText.trim(), prefs);

  await supabase.from('profiles').upsert(
    { id: session.user.id, email: session.user.email },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  const { data: saved, error } = await supabase
    .from('transcript_history')
    .insert({
      user_id: session.user.id,
      video_url: canonicalUrl,
      video_id: videoId,
      title: title?.trim() || `YouTube video ${videoId}`,
      transcript: processed,
      actor_run_id: 'extension-captions',
    })
    .select('*')
    .single();

  if (error) throw error;

  let summary = null;
  if (prefs.autoSummary && session.access_token) {
    try {
      summary = await fetchVideoSummary({
        accessToken: session.access_token,
        transcriptId: saved.id,
        transcript: processed,
        title: saved.title || title || '',
      });
    } catch {
      /* summary optional */
    }
  }

  return {
    ...saved,
    transcript: processed,
    summary,
  };
}
