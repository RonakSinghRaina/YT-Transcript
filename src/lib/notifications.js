export function createNotification({ type = 'info', title, message, transcriptId = null }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    transcriptId,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/** True when the user is not actively viewing this tab. */
export function isTabInBackground() {
  if (typeof document === 'undefined') return false;
  return document.hidden || !document.hasFocus();
}

export function showBrowserNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification(title, {
      body: body || '',
      tag: 'tubescribe-transcript',
      requireInteraction: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Show a completion alert when the tab is in the background (or always if forced). */
export function notifyTranscriptComplete(title, { force = false } = {}) {
  if (Notification.permission !== 'granted') return false;
  if (!force && !isTabInBackground()) return false;

  const body = title
    ? `"${title}" is saved and ready to read.`
    : 'Your transcript is saved and ready to read.';

  return showBrowserNotification('TubeScribe — Transcript ready', body);
}
