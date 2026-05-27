/* Runs in the YouTube page MAIN world — no imports. */
(function () {
  const INNERTUBE_CLIENTS = [
    { clientName: 'ANDROID', clientVersion: '20.10.38' },
    { clientName: 'WEB', clientVersion: '2.20250324.01.00' },
    { clientName: 'MWEB', clientVersion: '2.20250324.01.00' },
  ];

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function formatMs(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getInnertubeApiKey() {
    try {
      if (typeof window.ytcfg?.get === 'function') {
        const key = window.ytcfg.get('INNERTUBE_API_KEY');
        if (key) return key;
      }
    } catch {
      /* ignore */
    }
    return window.ytcfg?.data_?.INNERTUBE_API_KEY || null;
  }

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

  async function waitForPlayerResponse(maxMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const pr = readPlayerResponseSync();
      if (pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length) {
        return pr;
      }
      if (pr?.videoDetails?.videoId) return pr;
      await sleep(250);
    }
    return readPlayerResponseSync();
  }

  function readPlayerResponseSync() {
    if (window.ytInitialPlayerResponse) return window.ytInitialPlayerResponse;
    try {
      const args = window.ytplayer?.config?.args;
      if (args?.player_response) {
        return typeof args.player_response === 'string'
          ? JSON.parse(args.player_response)
          : args.player_response;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  async function fetchPlayerJson(videoId) {
    const apiKey = getInnertubeApiKey();
    if (!apiKey || !videoId) return null;

    for (const client of INNERTUBE_CLIENTS) {
      try {
        const res = await fetch(
          `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              context: { client },
              videoId,
            }),
          },
        );
        if (!res.ok) continue;
        const json = await res.json();
        const tracks = json?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (tracks?.length) return json;
      } catch {
        /* try next client */
      }
    }
    return null;
  }

  function parseXml(xml, includeTimestamps) {
    const re = /<text start="([^"]+)"[^>]*>([^<]*)<\/text>/g;
    const lines = [];
    let m;
    while ((m = re.exec(xml)) !== null) {
      const sec = Number(m[1]);
      const text = m[2]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
        .trim();
      if (!text) continue;
      lines.push(
        includeTimestamps && Number.isFinite(sec)
          ? `[${formatMs(sec * 1000)}] ${text}`
          : text,
      );
    }
    return lines.join(includeTimestamps ? '\n' : ' ').trim();
  }

  function parseJson3(jsonText, includeTimestamps) {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return '';
    }
    const lines = [];
    for (const ev of data?.events || []) {
      const text = (ev.segs || []).map((s) => s.utf8 || '').join('').trim();
      if (!text) continue;
      const ms = ev.tStartMs ?? 0;
      lines.push(includeTimestamps ? `[${formatMs(ms)}] ${text}` : text);
    }
    return lines.join(includeTimestamps ? '\n' : ' ').trim();
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

  async function downloadTrack(track, includeTimestamps) {
    for (const url of captionDownloadUrls(track.baseUrl || track.url)) {
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) continue;
        const text = await res.text();
        if (!text?.trim()) continue;
        if (url.includes('json3') || text.trimStart().startsWith('{')) {
          const j = parseJson3(text, includeTimestamps);
          if (j) return j;
        }
        const x = parseXml(text, includeTimestamps);
        if (x) return x;
      } catch {
        /* try next */
      }
    }
    return '';
  }

  async function fetchViaGetTranscript(params, includeTimestamps) {
    if (!params) return '';
    const apiKey = getInnertubeApiKey();
    if (!apiKey) return '';

    try {
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
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
        },
      );
      if (!res.ok) return '';
      return parseGetTranscript(await res.json(), includeTimestamps);
    } catch {
      return '';
    }
  }

  async function fetchTimedText(videoId, language, includeTimestamps) {
    const langs = [...new Set([language, 'en', 'hi', 'a.en', 'en-US', 'hi-IN'].filter(Boolean))];
    for (const lang of langs) {
      for (const fmt of ['json3', 'srv3', 'vtt', '']) {
        try {
          const fmtParam = fmt ? `&fmt=${fmt}` : '';
          const url = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}${fmtParam}`;
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) continue;
          const text = await res.text();
          if (!text?.trim()) continue;
          if (fmt === 'json3' || text.trimStart().startsWith('{')) {
            const j = parseJson3(text, includeTimestamps);
            if (j) return j;
          }
          const x = parseXml(text, includeTimestamps);
          if (x) return x;
        } catch {
          /* continue */
        }
      }
    }
    return '';
  }

  async function fetchFromTracks(tracks, tracklistRenderer, videoId, language, includeTimestamps) {
    const ordered = orderTracks(tracks, language);
    const listParams = tracklistRenderer?.getTranscriptEndpoint?.params;

    for (const track of ordered) {
      let text = await downloadTrack(track, includeTimestamps);
      if (text) return text;
      text = await fetchViaGetTranscript(track?.getTranscriptEndpoint?.params, includeTimestamps);
      if (text) return text;
    }

    if (listParams) {
      const text = await fetchViaGetTranscript(listParams, includeTimestamps);
      if (text) return text;
    }

    if (videoId) {
      for (const track of ordered) {
        const text = await fetchTimedText(videoId, track.languageCode || language, includeTimestamps);
        if (text) return text;
      }
    }
    return '';
  }

  function clickTranscriptButton() {
    const selectors = [
      'button[aria-label="Show transcript"]',
      'button[aria-label="Open transcript"]',
      'ytd-video-description-transcript-section-renderer button',
      '#description ytd-button-renderer button',
      'tp-yt-paper-button#expand',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        return true;
      }
    }
    return false;
  }

  async function scrapeVisibleTranscript(includeTimestamps) {
    let segments = document.querySelectorAll('ytd-transcript-segment-renderer');
    if (!segments.length) {
      clickTranscriptButton();
      await sleep(1200);
      segments = document.querySelectorAll('ytd-transcript-segment-renderer');
    }

    if (!segments.length) return '';

    const lines = [];
    segments.forEach((seg) => {
      const time =
        seg.querySelector('.segment-timestamp')?.textContent?.trim()
        || seg.querySelector('[class*="timestamp"]')?.textContent?.trim()
        || '';
      const text =
        seg.querySelector('.segment-text')?.textContent?.trim()
        || seg.querySelector('yt-formatted-string')?.textContent?.trim()
        || '';
      if (!text) return;
      lines.push(includeTimestamps && time ? `[${time}] ${text}` : text);
    });
    return lines.join(includeTimestamps ? '\n' : ' ').trim();
  }

  window.__tubescribeFetchCaptions = async function tubescribeFetchCaptions(
    includeTimestamps = true,
    language = null,
  ) {
    const videoId =
      new URLSearchParams(location.search).get('v')
      || readPlayerResponseSync()?.videoDetails?.videoId;

    let pr = await waitForPlayerResponse();
    const title =
      pr?.videoDetails?.title || document.title.replace(/\s*-\s*YouTube\s*$/, '').trim();

    if (!pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length && videoId) {
      const fetched = await fetchPlayerJson(videoId);
      if (fetched) pr = fetched;
    }

    const tracklist = pr?.captions?.playerCaptionsTracklistRenderer;
    const tracks = tracklist?.captionTracks;

    if (tracks?.length) {
      const transcriptText = await fetchFromTracks(
        tracks,
        tracklist,
        videoId,
        language,
        includeTimestamps,
      );
      if (transcriptText) {
        return {
          transcriptText,
          title,
          description: pr?.videoDetails?.shortDescription || '',
        };
      }
    }

    if (videoId) {
      const timed = await fetchTimedText(videoId, language, includeTimestamps);
      if (timed) {
        return {
          transcriptText: timed,
          title,
          description: pr?.videoDetails?.shortDescription || '',
        };
      }
    }

    const scraped = await scrapeVisibleTranscript(includeTimestamps);
    if (scraped) {
      return {
        transcriptText: scraped,
        title,
        description: pr?.videoDetails?.shortDescription || '',
      };
    }

    return { error: 'NO_CAPTIONS' };
  };
})();
