import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { formatDate } from '../lib/format';

const TYPE_STYLES = {
  success: 'text-primary bg-primary/20',
  error: 'text-error bg-error-container',
  info: 'text-primary bg-primary/15',
};

export default function NotificationBell({ notifications, onMarkAllRead, onOpenNotification }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) onMarkAllRead();
  }

  function handleItemClick(item) {
    setOpen(false);
    onOpenNotification(item);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/10 hover:text-primary"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Icon name="notifications" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-[-10px] top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-surface-container-lowest shadow-2xl sm:right-0 sm:w-96 sm:max-w-none">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-bold text-on-surface">Notifications</h3>
            {notifications.length > 0 && (
              <span className="text-xs text-primary">{notifications.length} total</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-primary">
                You&apos;ll see alerts here when a transcript finishes or fails.
              </p>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`flex w-full gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                    item.read ? 'opacity-85' : 'bg-primary/5'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_STYLES[item.type] || TYPE_STYLES.info}`}
                  >
                    <Icon
                      name={item.type === 'success' ? 'check_circle' : item.type === 'error' ? 'error' : 'hourglass_top'}
                      className="text-lg"
                      fill={item.type === 'success'}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-on-surface">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-primary">{item.message}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-on-surface-variant/80">
                      {formatDate(item.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
