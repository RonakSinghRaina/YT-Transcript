import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { getVideoId } from '../youtube';
import TranscriptSummaryCard from '../components/TranscriptSummaryCard';
import VideoPlayer from '../components/VideoPlayer';
import { resolveVideoSummary, segmentsWithTimestamps } from '../lib/transcriptUtils';

export default function Dashboard({
  session,
  videoUrl,
  setVideoUrl,
  result,
  loading,
  message,
  onGenerate,
  transcriptSearch,
  onSegmentClick,
  inputRef,
}) {
  const videoId = useMemo(() => getVideoId(videoUrl), [videoUrl]);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const [activeSegment, setActiveSegment] = useState(0);
  const [copied, setCopied] = useState(false);

  const segments = useMemo(() => {
    if (!result?.transcript) return [];
    return segmentsWithTimestamps(result.transcript);
  }, [result?.transcript]);

  const filteredSegments = useMemo(() => {
    if (!transcriptSearch.trim()) return segments;
    const q = transcriptSearch.toLowerCase();
    return segments.filter((s) => s.body.toLowerCase().includes(q));
  }, [segments, transcriptSearch]);

  const videoSummary = useMemo(() => resolveVideoSummary(result), [result]);

  async function copyTranscript() {
    if (!result?.transcript) return;
    await navigator.clipboard.writeText(result.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSegmentClick(index) {
    setActiveSegment(index);
    onSegmentClick?.();
  }

  if (!result && !loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
            Paste a video. Get a clean transcript.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-secondary">
            Drop any YouTube URL, Shorts link, share link, or video ID. Your transcripts are saved to your workspace.
          </p>
        </div>

        <form
          onSubmit={onGenerate}
          className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-ambient"
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            YouTube URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Icon
                name="link"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50"
              />
              <input
                ref={inputRef}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low py-4 pl-12 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !videoId}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="auto_awesome" />
              )}
              Generate
            </button>
          </div>
          {thumbnail && (
            <img src={thumbnail} alt="" className="mt-4 aspect-video w-full rounded-2xl object-cover" />
          )}
        </form>

        {message && (
          <p className="rounded-2xl bg-error-container px-4 py-3 text-center text-sm text-error">{message}</p>
        )}
      </div>
    );
  }

  const displayTitle = result?.title || 'Current Transcript';
  const activeVideoId = result?.video_id || videoId;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {!result && loading && (
        <div className="rounded-3xl border border-primary/30 bg-surface-container-lowest p-12 text-center shadow-ambient">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-surface-variant border-t-primary" />
          <h3 className="text-lg font-semibold">Transcribing your video…</h3>
          <p className="mt-2 text-sm text-secondary">This may take 20–40 seconds for longer videos.</p>
        </div>
      )}

      {message && (
        <p className="rounded-2xl bg-error-container px-4 py-3 text-sm text-error">{message}</p>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-7">
            <VideoPlayer
              key={activeVideoId}
              videoId={activeVideoId}
              title={displayTitle}
              videoUrl={result.video_url}
            />

            <TranscriptSummaryCard summary={videoSummary} />
          </div>

          <div className="flex min-h-[600px] flex-col lg:col-span-5">
            <div className="flex h-full flex-col rounded-3xl border border-outline-variant/10 bg-white shadow-ambient">
              <div className="flex items-center justify-between border-b border-outline-variant/10 p-4">
                <h3 className="text-lg font-semibold">Transcript</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={copyTranscript}
                    className="rounded-xl p-2 text-secondary transition-colors hover:bg-surface-container"
                    title="Copy"
                  >
                    <Icon name={copied ? 'check' : 'content_copy'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([result.transcript], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${(result.title || 'transcript').slice(0, 40)}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-xl p-2 text-secondary transition-colors hover:bg-surface-container"
                    title="Download"
                  >
                    <Icon name="download" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
                {filteredSegments.length ? (
                  filteredSegments.map((seg, idx) => {
                    const isActive = segments.indexOf(seg) === activeSegment;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => handleSegmentClick(segments.indexOf(seg))}
                        className={`w-full rounded-2xl p-3 text-left transition-all ${
                          isActive
                            ? 'border border-primary/10 bg-primary/5'
                            : 'hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              isActive ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-secondary'
                            }`}
                          >
                            {seg.time}
                          </span>
                          {isActive && (
                            <span className="animate-pulse text-[10px] font-bold uppercase text-primary">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-on-surface' : 'text-on-surface/70'}`}>
                          {seg.body}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-secondary">No matching text.</p>
                )}
              </div>

              <div className="rounded-b-3xl border-t border-outline-variant/10 bg-surface-container-lowest p-4">
                <button
                  type="button"
                  onClick={copyTranscript}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary/10 py-3 font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  <Icon name="edit" />
                  {copied ? 'Copied!' : 'Copy Full Transcript'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && result && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-2xl">
            <Icon name="progress_activity" className="mx-auto animate-spin text-4xl text-primary" />
            <p className="mt-3 text-sm font-semibold">Updating transcript…</p>
          </div>
        </div>
      )}
    </div>
  );
}
