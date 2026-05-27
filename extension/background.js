import { fetchTranscriptFromYouTubeCaptions } from '../lib/youtubeCaptions.mjs';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

async function resolveYouTubeTabId(preferredTabId) {
  if (preferredTabId) {
    try {
      const tab = await chrome.tabs.get(preferredTabId);
      if (tab?.url?.includes('youtube.com')) return tab.id;
    } catch {
      /* fall through */
    }
  }

  const tabs = await chrome.tabs.query({
    currentWindow: true,
    url: ['*://www.youtube.com/*', '*://youtube.com/*'],
  });

  const watch =
    tabs.find((t) => t.active && /[?&]v=|[/]shorts\//.test(t.url || ''))
    || tabs.find((t) => /[?&]v=|[/]shorts\//.test(t.url || ''))
    || tabs.find((t) => t.active)
    || tabs[0];

  return watch?.id ?? null;
}

async function injectAndFetchCaptions(tabId, message) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['injected/fetch-captions.js'],
    world: 'MAIN',
  });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (includeTimestamps, language) => {
      if (typeof window.__tubescribeFetchCaptions !== 'function') {
        return { error: 'Caption helper failed to load. Refresh the YouTube tab.' };
      }
      return window.__tubescribeFetchCaptions(includeTimestamps, language);
    },
    args: [message.includeTimestamps !== false, message.language || null],
  });

  return result;
}

async function fetchCaptionsInBackground(message) {
  const result = await fetchTranscriptFromYouTubeCaptions(message.videoId, {
    language: message.language || null,
    includeTimestamps: message.includeTimestamps !== false,
  });
  if (!result?.transcriptText) return null;
  return {
    transcriptText: result.transcriptText,
    title: result.item?.title || '',
    description: result.item?.description || '',
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'FETCH_CAPTIONS') return false;

  (async () => {
    try {
      const tabId = await resolveYouTubeTabId(message.tabId);
      let response = null;

      if (tabId) {
        try {
          response = await injectAndFetchCaptions(tabId, message);
        } catch (injectError) {
          response = { error: injectError.message || 'Could not read captions from YouTube tab.' };
        }
      }

      if (!response?.transcriptText && !response?.error) {
        response = await fetchCaptionsInBackground(message);
      }

      if (response?.error) {
        sendResponse({ error: response.error });
        return;
      }

      if (!response?.transcriptText) {
        sendResponse({ error: 'NO_CAPTIONS' });
        return;
      }

      sendResponse(response);
    } catch (error) {
      sendResponse({ error: error.message || 'Caption fetch failed.' });
    }
  })();

  return true;
});
