/* Classic content script — no imports (Chrome loads this as a regular script). */

function getYoutubeVideoElement() {
  const player = document.querySelector('#movie_player video, ytd-player video');
  return player instanceof HTMLVideoElement ? player : null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SEEK_VIDEO') {
    const video = getYoutubeVideoElement();
    const seconds = Math.max(0, Number(message.seconds) || 0);
    if (video) {
      video.currentTime = seconds;
      video.play().catch(() => {});
    }
    sendResponse({ ok: Boolean(video) });
    return true;
  }

  if (message.type === 'SCROLL_TO_VIDEO') {
    const target =
      document.querySelector('#movie_player')
      || document.querySelector('ytd-player')
      || document.querySelector('#player');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sendResponse({ ok: Boolean(target) });
    return true;
  }

  return false;
});
