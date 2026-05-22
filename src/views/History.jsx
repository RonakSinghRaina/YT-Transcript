import Icon from '../components/Icon';
import { formatShortDate } from '../lib/format';
import { isFavorite } from '../lib/favorites';

export default function History({
  history,
  loading,
  onOpen,
  onDelete,
  onToggleFavorite,
  showHeader = true,
  emptyTitle = 'No transcripts yet',
  emptyHint = 'Generate your first transcript from the dashboard.',
}) {
  return (
    <div className={showHeader ? 'mx-auto max-w-[var(--spacing-container-max)]' : ''}>
      {showHeader && (
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-on-surface md:text-3xl">Transcript History</h1>
            <p className="mt-2 text-sm text-primary">
              View, manage, and export your previous transcriptions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select className="cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-4 pr-10 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                <option>All Time</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
              <Icon
                name="expand_more"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center text-on-surface-variant">
          <Icon name="progress_activity" className="mx-auto animate-spin text-4xl text-primary" />
          <p className="mt-3 text-sm">Loading history…</p>
        </div>
      )}

      {!loading && !history.length && (
        <div className="rounded-3xl border border-dashed border-outline-variant bg-surface-container-low p-16 text-center">
          <Icon name="history" className="mx-auto text-5xl text-on-surface-variant/40" />
          <p className="mt-4 font-semibold text-on-surface">{emptyTitle}</p>
          <p className="mt-2 text-sm text-primary">{emptyHint}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {history.map((item) => {
          const favorited = isFavorite(item);
          return (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen(item);
                }
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-ambient transition-all hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(124,58,237,0.12)]"
            >
              <div className="relative aspect-video overflow-hidden bg-surface-container-high">
                {item.video_id ? (
                  <img
                    src={`https://img.youtube.com/vi/${item.video_id}/hqdefault.jpg`}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-on-surface-variant">
                    <Icon name="video_file" className="text-5xl" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-tight text-on-surface">
                  {item.title || 'Untitled transcript'}
                </h3>
                <p className="mb-4 text-xs text-on-surface-variant">
                  Generated {formatShortDate(item.created_at)}
                </p>
                <div
                  className="mt-auto flex items-center justify-between border-t border-outline-variant/40 pt-3 transition-colors group-hover:border-primary/50"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Open
                    <Icon name="arrow_forward" className="text-sm" />
                  </span>
                  <div className="flex gap-1">
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                          favorited
                            ? 'bg-primary/15 text-primary'
                            : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-primary'
                        }`}
                        title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Icon name="star" className="text-lg" fill={favorited} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const blob = new Blob([item.transcript || ''], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${(item.title || 'transcript').slice(0, 40)}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
                      title="Download"
                    >
                      <Icon name="download" className="text-lg" />
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-error-container/50 hover:text-error"
                        title="Delete"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="mt-8 flex items-center justify-between border-t border-outline-variant pt-6">
          <span className="text-sm text-on-surface-variant">
            Showing {history.length} transcript{history.length === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  );
}
