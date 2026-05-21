import Icon from './Icon';
import NotificationBell from './NotificationBell';
import { getDisplayName, getInitials } from '../lib/profile';

export default function TopBar({
  page,
  session,
  profile,
  searchQuery,
  onSearchChange,
  onOpenAuth,
  onGoHome,
  breadcrumbExtra,
  notifications,
  onMarkNotificationsRead,
  onOpenNotification,
}) {
  const email = session?.user?.email || '';
  const displayName = getDisplayName(session, profile);
  const initials = getInitials(displayName, email);

  return (
    <header className="sticky top-0 z-30 px-4 py-3 md:px-8">
      <div className="glass-panel mx-auto flex max-w-container-max items-center justify-between rounded-full border-white/10 px-4 py-2 shadow-[0_4px_24px_0_rgba(0,0,0,0.35)] md:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onGoHome}
            className="font-bold text-gradient-primary transition-opacity hover:opacity-80 md:hidden"
          >
            TS
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="hidden font-bold tracking-tight text-gradient-primary transition-opacity hover:opacity-80 md:block"
          >
            TubeScribe
          </button>
          <span className="hidden text-outline-variant/60 sm:inline">|</span>
          <nav className="hidden min-w-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={onGoHome}
              className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 hover:text-primary ${
                page === 'dashboard' && !breadcrumbExtra ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              Dashboard
            </button>
            {breadcrumbExtra && (
              <>
                <span className="text-outline-variant/50">/</span>
                <span className="border-b-2 border-primary pb-0.5 text-sm font-bold text-primary">
                  {breadcrumbExtra}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          {page === 'dashboard' && (
            <div className="relative hidden sm:block">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search transcript..."
                className="glass-input w-44 rounded-full border-none py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-outline focus:ring-0 lg:w-56"
              />
            </div>
          )}

          <NotificationBell
            notifications={notifications}
            onMarkAllRead={onMarkNotificationsRead}
            onOpenNotification={onOpenNotification}
          />

          {session ? (
            <div
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-primary/25 bg-gradient-accent-soft text-sm font-bold text-primary"
              title={displayName}
            >
              {initials}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold tracking-wide text-on-surface transition-all duration-300 hover:bg-white/10"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
