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
    <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-outline-variant/20 bg-surface px-4 py-4 shadow-sm md:px-12">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onGoHome}
          className="font-black text-primary transition-opacity hover:opacity-80 md:hidden"
        >
          TS
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="hidden font-black text-primary transition-opacity hover:opacity-80 md:block"
        >
          TubeScribe
        </button>
        <span className="hidden text-outline-variant sm:inline">|</span>
        <nav className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={onGoHome}
            className={`text-xs font-semibold uppercase tracking-wide transition-colors hover:text-primary ${
              page === 'dashboard' && !breadcrumbExtra ? 'text-primary' : 'text-secondary'
            }`}
          >
            Dashboard
          </button>
          {breadcrumbExtra && (
            <>
              <span className="text-outline-variant">/</span>
              <span className="border-b-2 border-primary pb-1 text-sm font-bold text-primary">
                {breadcrumbExtra}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {page === 'dashboard' && (
          <div className="relative hidden sm:block">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search transcript..."
              className="w-48 rounded-full border-none bg-surface-container-high py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 lg:w-64"
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
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-primary/10 bg-primary-fixed text-sm font-bold text-primary"
            title={displayName}
          >
            {initials}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90"
          >
            Log in
          </button>
        )}
      </div>
    </header>
  );
}
