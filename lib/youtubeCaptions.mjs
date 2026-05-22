const WATCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const XML_TRANSCRIPT_RE = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;

function pickCaptionTrack(tracks, preferredLanguage) {
  if (!tracks?.length) return null;

  if (preferredLanguage) {
    const exact = tracks.find((t) => t.languageCode === preferredLanguage);
    if (exact) return exact;
    const partial = tracks.find((t) => t.languageCode?.startsWith(preferredLanguage));
    if (partial) return partial;
  }

  const manual = tracks.filter((t) => t.kind !== 'asr');
  const pool = manual.length ? manual : tracks;
  return (
    pool.find((t) => t.languageCode === 'en')
    || pool.find((t) => t.languageCode?.startsWith('en'))
    || pool[0]
  );
}

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

function parseXmlTranscript(xml, includeTimestamps) {
  const lines = [];
  let match;
  while ((match = XML_TRANSCRIPT_RE.exec(xml)) !== null) {
    const startSec = Number(match[1]);
    const text = decodeXmlEntities(match[3]);
    if (!text) continue;
    if (includeTimestamps && Number.isFinite(startSec)) {
      lines.push(`[${formatMs(startSec * 1000)}] ${text}`);
    } else {
      lines.push(text);
    }
  }
  return lines.join(includeTimestamps ? '\n' : ' ').replace(/\s+/g, ' ').trim();
}

async function fetchCaptionTracks(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const watchResponse = await fetch(watchUrl, { headers: WATCH_HEADERS });
  if (!watchResponse.ok) return null;

  const html = await watchResponse.text();
  if (html.includes('class="g-recaptcha"')) return null;

  const apiKeyMatch =
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
    || html.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/);
  if (!apiKeyMatch) return null;

  const playerResponse = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
    {
      method: 'POST',
      headers: { ...WATCH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
          },
        },
        videoId,
      }),
    },
  );

  if (!playerResponse.ok) return null;

  const playerJson = await playerResponse.json();
  const tracklist =
    playerJson.captions?.playerCaptionsTracklistRenderer
    || playerJson.playerCaptionsTracklistRenderer;
  const tracks = tracklist?.captionTracks;

  if (!Array.isArray(tracks) || !tracks.length) return null;

  return { tracks, playerJson };
}

async function downloadCaptionTrack(track, includeTimestamps) {
  const base = track.baseUrl || track.url;
  if (!base) return '';

  const transcriptUrl = base.replace(/&fmt=[^&]+/, '');
  const response = await fetch(transcriptUrl, { headers: WATCH_HEADERS });
  if (!response.ok) return '';

  const xml = await response.text();
  return parseXmlTranscript(xml, includeTimestamps);
}

export async function fetchTranscriptFromYouTubeCaptions(videoId, { language = null, includeTimestamps = true } = {}) {
  const captionData = await fetchCaptionTracks(videoId);
  if (!captionData) return null;

  const { tracks, playerJson } = captionData;
  const track = pickCaptionTrack(tracks, language);
  if (!track) return null;

  const transcriptText = await downloadCaptionTrack(track, includeTimestamps);
  if (!transcriptText) return null;

  return {
    item: {
      videoId,
      title: playerJson?.videoDetails?.title || `YouTube video ${videoId}`,
      description: playerJson?.videoDetails?.shortDescription || '',
      channelTitle: playerJson?.videoDetails?.author || '',
      language: track.languageCode || language || 'auto',
      transcriptMethod: 'youtube-captions',
    },
    transcriptText,
    methodUsed: 'youtube-captions',
  };
}
