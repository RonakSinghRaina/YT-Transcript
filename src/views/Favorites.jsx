import History from './History';

export default function Favorites({ setupHint, ...props }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface md:text-3xl">Favorites</h1>
        <p className="mt-2 text-sm text-primary">
          Transcripts you have starred for quick access.
        </p>
        {setupHint && (
          <p className="mt-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-on-surface/90">
            {setupHint} In Supabase → SQL Editor, run the script from{' '}
            <code className="text-primary">supabase-migrations/add_is_favorite.sql</code>{' '}
            in this repo, then refresh the app.
          </p>
        )}
      </div>
      <History {...props} emptyTitle="No favorites yet" emptyHint="Star transcripts from History or the Dashboard to see them here." />
    </div>
  );
}
