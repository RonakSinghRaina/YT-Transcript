import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import { getDisplayName, getInitials } from '../lib/profile';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'help', label: 'Help', icon: 'help' },
];

export default function MobileNav({
  open,
  onClose,
  page,
  onNavigate,
  onGoHome,
  onNewTranscript,
  session,
  profile,
  onLogout,
  onLogin,
  onOpenSettings,
}) {
  const email = session?.user?.email || '';
  const displayName = getDisplayName(session, profile);
  const initials = getInitials(displayName, email);
  // Keep the component always mounted; use CSS for show/hide transitions.
  // This avoids expensive DOM mount/unmount that causes the lag.
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      // Trigger CSS transition on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      // Wait for the exit animation to finish before hiding
      const timer = setTimeout(() => setVisible(false), 280);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function go(id) {
    onClose();
    // Defer the heavy page transition until after the slide-out animation finishes (280ms)
    // This perfectly eliminates the lag / freezing behavior!
    setTimeout(() => {
      if (id === 'dashboard') onGoHome();
      else onNavigate(id);
    }, 280);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      style={{ pointerEvents: animating ? 'auto' : 'none' }}
    >
      {/* Backdrop — simple opacity, no heavy blur */}
      <button
        className="absolute inset-0 transition-opacity duration-300 ease-out"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${animating ? 0.6 : 0})`,
        }}
        aria-label="Close menu"
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        className="absolute left-0 top-0 flex h-full w-[min(85vw,280px)] flex-col border-r border-white/10 bg-surface-container-low shadow-2xl transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: animating ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <BrandLogo size="sm" onClick={() => go('dashboard')} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item, index) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                  active
                    ? 'border-primary/25 bg-gradient-accent-soft text-primary'
                    : 'border-transparent text-on-surface-variant hover:bg-white/5 hover:text-primary'
                }`}
                style={{
                  opacity: animating ? 1 : 0,
                  transform: animating ? 'translateX(0)' : 'translateX(-12px)',
                  transition: `opacity 200ms ease ${80 + index * 40}ms, transform 200ms ease ${80 + index * 40}ms`,
                }}
              >
                <Icon name={item.icon} fill={active} />
                <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-4">
          <button
            type="button"
            onClick={() => {
              onNewTranscript();
              onClose();
            }}
            className="btn-pulse mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-accent py-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container"
            style={{
              opacity: animating ? 1 : 0,
              transform: animating ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 200ms ease 260ms, transform 200ms ease 260ms',
            }}
          >
            <Icon name="add" />
            New Transcript
          </button>
          {session ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => onOpenSettings(), 280);
                }}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-gradient-accent-soft text-sm font-bold text-primary">
                  {initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-on-surface">{displayName}</span>
                  <span className="block text-xs text-on-surface-variant">View account</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => onLogout(), 280);
                }}
                className="flex w-full items-center gap-2 rounded-xl p-3 text-on-surface-variant transition-colors hover:bg-white/5"
              >
                <Icon name="logout" />
                <span className="text-xs font-semibold uppercase">Log out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onLogin();
                onClose();
              }}
              className="flex w-full items-center justify-center rounded-2xl border border-primary/30 py-3 text-sm font-semibold text-primary"
            >
              Log in
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
