import Icon from './Icon';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function SideNav({ page, onNavigate, onGoHome, onNewTranscript, onLogout, onLogin, session }) {
  return (
    <aside className="relative z-20 hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-white/5 md:flex">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-container-low via-surface-container to-surface-container-low" />
      <div className="absolute -left-24 top-0 h-40 w-40 rounded-full bg-primary-container/15 blur-[80px]" />
      <div className="absolute -left-16 bottom-24 h-32 w-32 rounded-full bg-secondary-container/20 blur-[60px]" />

      <div className="relative flex h-full flex-col p-6">
        <div className="mb-10">
          <button
            type="button"
            onClick={onGoHome}
            className="text-left text-xl font-bold tracking-tight text-gradient-primary transition-opacity hover:opacity-80"
          >
            TubeScribe
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (item.id === 'dashboard' ? onGoHome() : onNavigate(item.id))}
                className={`flex items-center gap-2 rounded-xl p-3 transition-all duration-300 ${
                  active
                    ? 'scale-[0.98] border border-primary/25 bg-gradient-accent-soft text-primary shadow-[0_0_12px_rgba(124,58,237,0.12)]'
                    : 'text-on-surface-variant hover:border hover:border-white/5 hover:bg-white/5 hover:text-primary'
                }`}
              >
                <Icon name={item.icon} fill={active} />
                <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={onNewTranscript}
            className="btn-pulse flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-accent py-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container"
          >
            <Icon name="add" className="text-lg" />
            New Transcript
          </button>
          <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => onNavigate('help')}
              className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${
                page === 'help'
                  ? 'bg-white/10 text-primary'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-primary'
              }`}
            >
              <Icon name="help" className="text-xl" />
              <span className="text-xs font-semibold uppercase tracking-wide">Help</span>
            </button>
            {session ? (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
              >
                <Icon name="logout" className="text-xl" />
                <span className="text-xs font-semibold uppercase tracking-wide">Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="flex items-center gap-2 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
              >
                <Icon name="login" className="text-xl" />
                <span className="text-xs font-semibold uppercase tracking-wide">Log in</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
