const WATCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const XML_TRANSCRIPT_RE = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;

const INNERTUBE_CLIENTS = [
  { clientName: 'ANDROID', clientVersion: '20.10.38' },
  { clientName: 'WEB', clientVersion: '2.20250324.01.00' },
  { clientName: 'MWEB', clientVersion: '2.20250324.01.00' },
  { clientName: 'TVHTML5', clientVersion: '7.20250319.10.00' },
];

function orderTracks(tracks, language) {
  const score = (t) => {
    const code = t.languageCode || '';
    if (language && code === language) return 0;
    if (language && code.startsWith(language)) return 1;
    if (code === 'en') return 2;
    if (code.startsWith('en')) return 3;
    if (code.startsWith('hi')) return 4;
    if (t.kind !== 'asr') return 5;
    return 6;
  };
  return [...tracks].sort((a, b) => score(a) - score(b));
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
  XML_TRANSCRIPT_RE.lastIndex = 0;
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

function parseJson3Transcript(jsonText, includeTimestamps) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return '';
  }

  const lines = [];
  for (const event of data?.events || []) {
    const startMs = event.tStartMs ?? event.ts ?? 0;
    const text = (event.segs || []).map((s) => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
    if (!text) continue;
    lines.push(includeTimestamps ? `[${formatMs(startMs)}] ${text}` : text);
  }
  return lines.join(includeTimestamps ? '\n' : ' ').replace(/\s+/g, ' ').trim();
}

function findTranscriptSegments(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 14) return null;
  if (obj.transcriptSegmentListRenderer?.initialSegments?.length) {
    return obj.transcriptSegmentListRenderer.initialSegments;
  }
  if (Array.isArray(obj.initialSegments) && obj.initialSegments[0]?.transcriptSegmentRenderer) {
    return obj.initialSegments;
  }
  for (const value of Object.values(obj)) {
    const found = findTranscriptSegments(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function parseGetTranscript(json, includeTimestamps) {
  const segments = findTranscriptSegments(json);
  if (!segments?.length) return '';

  const lines = [];
  for (const seg of segments) {
    const r = seg.transcriptSegmentRenderer;
    if (!r) continue;
    const text = (r.snippet?.runs || []).map((run) => run.text || '').join('').trim();
    if (!text) continue;
    const ms = Number(r.startMs) || 0;
    lines.push(includeTimestamps ? `[${formatMs(ms)}] ${text}` : text);
  }
  return lines.join(includeTimestamps ? '\n' : ' ').trim();
}

export function extractCaptionTracksFromPlayerJson(playerJson) {
  const tracklist =
    playerJson?.captions?.playerCaptionsTracklistRenderer
    || playerJson?.playerCaptionsTracklistRenderer;
  const tracks = tracklist?.captionTracks;
  return Array.isArray(tracks) && tracks.length ? tracks : null;
}

export function extractTracklistRenderer(playerJson) {
  return (
    playerJson?.captions?.playerCaptionsTracklistRenderer
    || playerJson?.playerCaptionsTracklistRenderer
    || null
  );
}

export function extractYtInitialPlayerResponseFromHtml(html) {
  const marker = 'ytInitialPlayerResponse';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  const braceStart = html.indexOf('{', idx);
  if (braceStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = braceStart; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(braceStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function fetchWatchHtml(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const watchResponse = await fetch(watchUrl, { headers: WATCH_HEADERS });
  if (!watchResponse.ok) return null;
  const html = await watchResponse.text();
  if (html.includes('class="g-recaptcha"')) return null;
  return html;
}

function extractApiKeyFromHtml(html) {
  return (
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
    || html.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/)?.[1]
    || null
  );
}

async function fetchInnertubePlayer(videoId, apiKey, client) {
  const playerResponse = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
    {
      method: 'POST',
      headers: { ...WATCH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client },
        videoId,
      }),
    },
  );
  if (!playerResponse.ok) return null;
  return playerResponse.json();
}

async function resolveCaptionData(videoId, html, playerJsonHint = null) {
  if (playerJsonHint) {
    const tracks = extractCaptionTracksFromPlayerJson(playerJsonHint);
    if (tracks) {
      return { tracks, playerJson: playerJsonHint, tracklist: extractTracklistRenderer(playerJsonHint) };
    }
  }

  if (html) {
    const fromHtml = extractYtInitialPlayerResponseFromHtml(html);
    const tracks = extractCaptionTracksFromPlayerJson(fromHtml);
    if (tracks) {
      return { tracks, playerJson: fromHtml, tracklist: extractTracklistRenderer(fromHtml) };
    }
  }

  const pageHtml = html || (await fetchWatchHtml(videoId));
  if (!pageHtml) return null;

  const apiKey = extractApiKeyFromHtml(pageHtml);
  if (!apiKey) return null;

  for (const client of INNERTUBE_CLIENTS) {
    const playerJson = await fetchInnertubePlayer(videoId, apiKey, client);
    const tracks = extractCaptionTracksFromPlayerJson(playerJson);
    if (tracks) {
      return { tracks, playerJson, tracklist: extractTracklistRenderer(playerJson) };
    }
  }

  return null;
}

function captionDownloadUrls(base) {
  if (!base) return [];
  const clean = base.replace(/&fmt=[^&]+/g, '');
  return [
    `${clean}${clean.includes('?') ? '&' : '?'}fmt=json3`,
    clean,
    `${clean}${clean.includes('?') ? '&' : '?'}fmt=srv3`,
    `${clean}${clean.includes('?') ? '&' : '?'}fmt=vtt`,
    base,
  ];
}

async function downloadCaptionTrack(track, includeTimestamps, fetchOptions = {}) {
  for (const url of captionDownloadUrls(track.baseUrl || track.url)) {
    try {
      const response = await fetch(url, { headers: WATCH_HEADERS, ...fetchOptions });
      if (!response.ok) continue;
      const text = await response.text();
      if (!text?.trim()) continue;
      if (url.includes('json3') || text.trimStart().startsWith('{')) {
        const parsed = parseJson3Transcript(text, includeTimestamps);
        if (parsed) return parsed;
      }
      const parsed = parseXmlTranscript(text, includeTimestamps);
      if (parsed) return parsed;
    } catch {
      /* try next */
    }
  }
  return '';
}

async function fetchViaGetTranscript(params, apiKey, includeTimestamps, fetchOptions = {}) {
  if (!params || !apiKey) return '';

  try {
    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { ...WATCH_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20250324.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
          params,
        }),
        ...fetchOptions,
      },
    );
    if (!response.ok) return '';
    return parseGetTranscript(await response.json(), includeTimestamps);
  } catch {
    return '';
  }
}

async function fetchTimedText(videoId, language, includeTimestamps, fetchOptions = {}) {
  const langs = [...new Set([language, 'en', 'hi', 'a.en', 'en-US', 'hi-IN'].filter(Boolean))];
  for (const lang of langs) {
    for (const fmt of ['json3', 'srv3', 'vtt', '']) {
      try {
        const fmtParam = fmt ? `&fmt=${fmt}` : '';
        const url = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}${fmtParam}`;
        const response = await fetch(url, { headers: WATCH_HEADERS, ...fetchOptions });
        if (!response.ok) continue;
        const text = await response.text();
        if (!text?.trim()) continue;
        if (fmt === 'json3' || text.trimStart().startsWith('{')) {
          const parsed = parseJson3Transcript(text, includeTimestamps);
          if (parsed) return parsed;
        }
        const parsed = parseXmlTranscript(text, includeTimestamps);
        if (parsed) return parsed;
      } catch {
        /* continue */
      }
    }
  }
  return '';
}

async function fetchFromAllTracks({
  tracks,
  tracklist,
  videoId,
  language,
  includeTimestamps,
  apiKey,
  fetchOptions,
}) {
  const ordered = orderTracks(tracks, language);
  const listParams = tracklist?.getTranscriptEndpoint?.params;

  for (const track of ordered) {
    let text = await downloadCaptionTrack(track, includeTimestamps, fetchOptions);
    if (text) return text;
    text = await fetchViaGetTranscript(track?.getTranscriptEndpoint?.params, apiKey, includeTimestamps, fetchOptions);
    if (text) return text;
  }

  if (listParams && apiKey) {
    const text = await fetchViaGetTranscript(listParams, apiKey, includeTimestamps, fetchOptions);
    if (text) return text;
  }

  if (videoId) {
    for (const track of ordered) {
      const text = await fetchTimedText(videoId, track.languageCode || language, includeTimestamps, fetchOptions);
      if (text) return text;
    }
  }

  return '';
}

export async function fetchTranscriptFromYouTubeCaptions(
  videoId,
  { language = null, includeTimestamps = true, playerJson = null, fetchOptions = {} } = {},
) {
  const pageHtml = playerJson ? null : await fetchWatchHtml(videoId);
  const apiKey = pageHtml ? extractApiKeyFromHtml(pageHtml) : null;
  const captionData = await resolveCaptionData(videoId, pageHtml, playerJson);

  if (captionData?.tracks?.length) {
    const transcriptText = await fetchFromAllTracks({
      tracks: captionData.tracks,
      tracklist: captionData.tracklist,
      videoId,
      language,
      includeTimestamps,
      apiKey,
      fetchOptions,
    });

    if (transcriptText) {
      return {
        item: {
          videoId,
          title: captionData.playerJson?.videoDetails?.title || `YouTube video ${videoId}`,
          description: captionData.playerJson?.videoDetails?.shortDescription || '',
          channelTitle: captionData.playerJson?.videoDetails?.author || '',
          language: language || 'auto',
          transcriptMethod: 'youtube-captions',
        },
        transcriptText,
        methodUsed: 'youtube-captions',
      };
    }
  }

  const timed = await fetchTimedText(videoId, language, includeTimestamps, fetchOptions);
  if (timed) {
    return {
      item: {
        videoId,
        title: captionData?.playerJson?.videoDetails?.title || `YouTube video ${videoId}`,
        description: captionData?.playerJson?.videoDetails?.shortDescription || '',
        transcriptMethod: 'youtube-timedtext',
      },
      transcriptText: timed,
      methodUsed: 'youtube-timedtext',
    };
  }

  return null;
}
