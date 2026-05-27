import Icon from './Icon';
import BrandLogo from './BrandLogo';

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
  onLogout,
  onLogin,
}) {
  if (!open) return null;

  function go(id) {
    if (id === 'dashboard') onGoHome();
    else onNavigate(id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 flex h-full w-[min(100%,280px)] flex-col border-r border-white/10 bg-surface-container-low shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <BrandLogo size="sm" onClick={() => go('dashboard')} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-on-surface-variant hover:bg-white/5 hover:text-primary"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                  active
                    ? 'border border-primary/25 bg-gradient-accent-soft text-primary'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-primary'
                }`}
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
          >
            <Icon name="add" />
            New Transcript
          </button>
          {session ? (
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-xl p-3 text-on-surface-variant hover:bg-white/5"
            >
              <Icon name="logout" />
              <span className="text-xs font-semibold uppercase">Log out</span>
            </button>
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
