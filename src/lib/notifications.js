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

export function showBrowserNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: 'tubescribe-transcript',
    });
  } catch {
    // Ignore if notifications are blocked in this context.
  }
}
