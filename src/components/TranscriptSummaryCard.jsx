import Icon from './Icon';

const SOURCE_LABELS = {
  openai: 'AI-generated overview',
  gemini: 'AI-generated overview',
  extractive: 'Transcript-based overview (add OPENAI_API_KEY or GEMINI_API_KEY for richer summaries)',
};

export default function TranscriptSummaryCard({ summary, loading, error, onRegenerate }) {
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
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!summary?.overview) return null;

  const paragraphs = String(summary.overview)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const sourceHint = SOURCE_LABELS[summary.source] || null;

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed-dim text-primary">
            <Icon name="auto_awesome" fill />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Video Summary</h3>
            {sourceHint && <p className="text-xs text-primary">{sourceHint}</p>}
          </div>
        </div>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="shrink-0 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Regenerate'}
          </button>
        )}
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
