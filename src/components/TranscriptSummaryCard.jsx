import Icon from './Icon';

export default function TranscriptSummaryCard({ summary }) {
  if (!summary) return null;

  const { overview, sections = [], source } = summary;

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed-dim text-primary">
          <Icon name="auto_awesome" fill />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-on-surface">Video Summary</h3>
          <p className="text-xs text-on-surface-variant">
            {source === 'openai' ? 'AI-generated overview' : 'Smart excerpt — no timestamps'}
          </p>
        </div>
      </div>

      {overview && (
        <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/80 px-4 py-3 text-base leading-relaxed text-on-surface">
          {overview}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {section.heading}
            </h4>
            <ul className="space-y-2.5">
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-on-surface"
                >
                  <Icon name="check_circle" className="mt-0.5 shrink-0 text-lg text-primary" fill />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
