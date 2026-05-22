import Icon from '../components/Icon';

const SECTIONS = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'How do I generate a transcript?',
        a: 'Sign in, paste any YouTube URL (watch link, Shorts, or youtu.be share link) on the Dashboard, then click Generate. Your transcript is saved automatically to History.',
      },
      {
        q: 'Do I need an account?',
        a: 'Yes. A free account lets you save transcripts, view history, and receive notifications when generation finishes.',
      },
    ],
  },
  {
    title: 'Supported links',
    items: [
      {
        q: 'Which YouTube URLs work?',
        a: 'Standard watch links (youtube.com/watch?v=…), Shorts, embed URLs, youtu.be share links, and bare 11-character video IDs.',
      },
      {
        q: 'How long can videos be?',
        a: 'Most videos up to about 2 hours work well. Very long videos may take longer to process or hit service limits.',
      },
    ],
  },
  {
    title: 'Using your workspace',
    items: [
      {
        q: 'What is the Video Summary?',
        a: 'After generation, TubeScribe builds a structured summary with headings and bullet points—no timestamps in the summary panel.',
      },
      {
        q: 'Can I search inside a transcript?',
        a: 'Yes. Use the search bar in the header on the Dashboard to find saved transcripts by video title or any line from the transcript text.',
      },
      {
        q: 'How do notifications work?',
        a: 'The bell icon shows when transcription starts, completes, or fails. Allow browser notifications to get alerts when the tab is in the background.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        q: 'Generation failed or timed out',
        a: 'Check your connection, confirm the video is public, and try again. Restart the dev server if you are running locally (npm run dev).',
      },
      {
        q: 'Video will not play in the app',
        a: 'Some videos block embedding on third-party sites. Use “Open on YouTube” if the in-app player does not start.',
      },
      {
        q: 'Transcript is empty',
        a: 'The video may have no captions in your language. Try another video or check transcription settings.',
      },
    ],
  },
];

export default function Help({ onGoHome, onNewTranscript }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-on-surface md:text-3xl">Help & support</h1>
        <p className="mt-2 text-primary">
          Quick answers for using TubeScribe to turn YouTube videos into transcripts and summaries.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onGoHome}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90"
        >
          Go to Dashboard
        </button>
        <button
          type="button"
          onClick={onNewTranscript}
          className="rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
        >
          New Transcript
        </button>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-ambient"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
              <Icon name="help" className="text-xl" />
              {section.title}
            </h2>
            <div className="space-y-4">
              {section.items.map((item) => (
                <div key={item.q}>
                  <h3 className="text-sm font-semibold text-on-surface">{item.q}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-primary">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-on-surface-variant">
        Need more help? Check Settings for account details or contact your workspace administrator.
      </p>
    </div>
  );
}
