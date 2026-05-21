import Icon from './Icon';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'favorites', label: 'Favorites', icon: 'star', disabled: true },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function SideNav({ page, onNavigate, onGoHome, onNewTranscript, onLogout, onLogin, session }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant/20 bg-surface-container-low p-6 md:flex">
      <div className="mb-10">
        <button
          type="button"
          onClick={onGoHome}
          className="text-left text-xl font-black text-primary transition-opacity hover:opacity-80"
        >
          TubeScribe
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = page === item.id;
          if (item.disabled) {
            return (
              <span
                key={item.id}
                className="flex cursor-not-allowed items-center gap-2 rounded-xl p-3 text-secondary/50"
                title="Coming soon"
              >
                <Icon name={item.icon} />
                <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
              </span>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-2 rounded-xl p-3 transition-all ${
                active
                  ? 'scale-[0.98] bg-primary-container text-on-primary-container'
                  : 'text-secondary hover:bg-secondary-container'
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-semibold uppercase tracking-wide text-on-primary hover:opacity-90"
        >
          <Icon name="add" className="text-lg" />
          New Transcript
        </button>
        <div className="mt-4 flex flex-col gap-1 border-t border-outline-variant/30 pt-4">
          <button
            type="button"
            onClick={() => onNavigate('help')}
            className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${
              page === 'help' ? 'bg-secondary-container text-primary' : 'text-secondary hover:text-primary'
            }`}
          >
            <Icon name="help" className="text-xl" />
            <span className="text-xs font-semibold uppercase tracking-wide">Help</span>
          </button>
          {session ? (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-lg p-2 text-secondary hover:text-primary"
            >
              <Icon name="logout" className="text-xl" />
              <span className="text-xs font-semibold uppercase tracking-wide">Logout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="flex items-center gap-2 rounded-lg p-2 text-secondary hover:text-primary"
            >
              <Icon name="login" className="text-xl" />
              <span className="text-xs font-semibold uppercase tracking-wide">Log in</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
