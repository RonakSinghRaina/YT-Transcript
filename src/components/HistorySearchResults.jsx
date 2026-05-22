import Icon from './Icon';
import { excerptMatch } from '../lib/searchHistory';
import { formatShortDate } from '../lib/format';

export default function HistorySearchResults({ results, query, onOpen, onClear }) {
  if (!query.trim()) return null;

  return (
    <div className="glass-panel mb-8 rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">
          Saved transcripts matching &ldquo;{query}&rdquo;
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-semibold text-primary hover:text-primary-fixed"
        >
          Clear
        </button>
      </div>

      {!results.length ? (
        <p className="text-sm text-primary">
          No saved transcripts match your search. Generate transcripts first, then search by title or
          transcript text.
        </p>
      ) : (
        <ul className="space-y-3">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-colors hover:border-primary/25 hover:bg-primary/5"
              >
                {item.video_id && (
                  <img
                    src={`https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`}
                    alt=""
                    className="h-16 w-28 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface line-clamp-1">
                    {item.title || 'Untitled transcript'}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {formatShortDate(item.created_at)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-primary line-clamp-2">
                    {excerptMatch(item.transcript, query)}
                  </p>
                </div>
                <Icon name="arrow_forward" className="shrink-0 text-primary" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
