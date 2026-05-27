import { getVideoId } from '../youtube';

export function isExtensionContext() {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
}

/** Find the YouTube watch tab in the current window (side panel may steal "active" focus). */
export function getYouTubeTabId() {
  return new Promise((resolve) => {
    if (!chrome?.tabs?.query) {
      resolve(null);
      return;
    }
    chrome.tabs.query({ currentWindow: true, url: ['*://www.youtube.com/*', '*://youtube.com/*'] }, (tabs) => {
      if (chrome.runtime.lastError || !tabs?.length) {
        resolve(null);
        return;
      }
      const watch =
        tabs.find((t) => t.active && getVideoId(t.url || ''))
        || tabs.find((t) => getVideoId(t.url || ''))
        || tabs.find((t) => t.active)
        || tabs[0];
      resolve(watch?.id ?? null);
    });
  });
}

export function getActiveYouTubeTabUrl() {
  return new Promise((resolve) => {
    if (!chrome?.tabs?.query) {
      resolve(null);
      return;
    }
    chrome.tabs.query({ currentWindow: true, url: ['*://www.youtube.com/*', '*://youtube.com/*'] }, (tabs) => {
      const watch =
        tabs?.find((t) => t.active && getVideoId(t.url || ''))
        || tabs?.find((t) => getVideoId(t.url || ''));
      const url = watch?.url || '';
      resolve(getVideoId(url) ? url : null);
    });
  });
}

export function fetchCaptionsFromExtension(videoId, { language = null, includeTimestamps = true, tabId = null } = {}) {
  return new Promise(async (resolve, reject) => {
    const targetTabId = tabId || (await getYouTubeTabId());
    chrome.runtime.sendMessage(
      {
        type: 'FETCH_CAPTIONS',
        videoId,
        tabId: targetTabId,
        language,
        includeTimestamps,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error === 'NO_CAPTIONS' ? 'NO_CAPTIONS' : response.error));
          return;
        }
        resolve(response);
      },
    );
  });
}

export function seekYouTubeTab(seconds) {
  getYouTubeTabId().then((tabId) => {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, { type: 'SEEK_VIDEO', seconds });
    chrome.tabs.sendMessage(tabId, { type: 'SCROLL_TO_VIDEO' });
  });
}
