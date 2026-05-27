import Icon from './Icon';

const FEATURES = [
  {
    icon: 'auto_awesome',
    iconClass: 'text-primary',
    title: 'AI Summarization',
    description:
      'Condense hours of video into actionable insights. Our AI reads between the lines to deliver concise, perfectly structured summaries instantly.',
    wide: true,
    glow: 'bg-primary/5',
    float: '',
  },
  {
    icon: 'schedule',
    iconClass: 'text-primary-fixed',
    title: 'Precision Timestamps',
    description: 'Navigate long-form content effortlessly with intelligent timeline markers.',
    wide: false,
    glow: 'bg-primary-container/8',
    float: 'float-card-delay-1',
  },
  {
    icon: 'bolt',
    iconClass: 'text-primary-container',
    title: 'Fast Processing',
    description: 'Optimized pipeline processes lengthy videos in a fraction of the playback time.',
    wide: false,
    glow: '',
    float: 'float-card-delay-2',
  },
  {
    icon: 'import_export',
    iconClass: 'text-tertiary',
    title: 'Export to PDF/TXT',
    description:
      'Seamlessly transition your extracted knowledge into your workflow. Export clean text or styled PDFs with a single click, ready for your notes app or team wiki.',
    wide: true,
    glow: 'bg-tertiary-container/5',
    float: 'float-card-delay-3',
  },
];

export default function FeatureCards() {
  return (
    <section className="relative z-10 mt-16">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
          Engineered for Precision
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">
          Hyper-accurate extraction tools wrapped in a minimal, high-performance interface.
        </p>
      </div>

      <div className="grid auto-rows-[220px] grid-cols-1 gap-6 md:grid-cols-3 md:auto-rows-[240px]">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className={`glass-panel float-card group relative flex h-full flex-col justify-center overflow-hidden rounded-3xl px-8 py-7 ${feature.wide ? 'md:col-span-2' : ''} ${feature.float}`}
          >
            {feature.glow && (
              <div
                className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${feature.glow}`}
              />
            )}
            {feature.icon === 'schedule' && (
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-container/10 blur-[40px]" />
            )}
            {feature.icon === 'import_export' && (
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-tertiary-container/5 blur-[50px]" />
            )}
            <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-surface-container-high/50 backdrop-blur-md">
              <Icon name={feature.icon} className={`text-2xl ${feature.iconClass}`} fill />
            </div>
            <div className="relative z-10">
              <h3 className="mb-2 text-xl font-semibold tracking-tight text-on-surface">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-on-surface-variant">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
