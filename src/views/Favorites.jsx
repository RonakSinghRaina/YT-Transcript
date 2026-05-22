import History from './History';

export default function Favorites(props) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface md:text-3xl">Favorites</h1>
        <p className="mt-2 text-sm text-primary">
          Transcripts you have starred for quick access.
        </p>
      </div>
      <History {...props} emptyTitle="No favorites yet" emptyHint="Star transcripts from History or the Dashboard to see them here." />
    </div>
  );
}
