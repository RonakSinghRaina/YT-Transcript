import Icon from './Icon';

export default function TranscriptSummaryCard({ summary, loading, error }) {
  if (loading && !summary?.overview) {
    return (
      <div className="glass-panel rounded-3xl p-6 lg:p-8">
        <div className="flex items-center gap-3 text-primary">
          <Icon name="auto_awesome" className="animate-pulse" />
          <p className="text-sm">Building video summary from transcript…</p>
        </div>
      </div>
    );
  }

  if (!summary?.overview && error) {
    return (
      <div className="glass-panel rounded-3xl p-6 lg:p-8">
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  if (!summary?.overview) return null;

  const paragraphs = String(summary.overview)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed-dim text-primary">
          <Icon name="auto_awesome" fill />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">Video Summary</h3>
      </div>

      <div className="space-y-4">
        {paragraphs.map((para) => (
          <p
            key={para.slice(0, 48)}
            className="text-base leading-relaxed text-on-surface/90"
          >
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
