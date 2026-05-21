import { useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import FeatureCards from '../components/FeatureCards';
import { getVideoId } from '../youtube';
import TranscriptSummaryCard from '../components/TranscriptSummaryCard';
import VideoPlayer from '../components/VideoPlayer';
import { downloadTranscriptPdf, downloadTranscriptTxt } from '../lib/exportTranscript';
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
  inputRef,
}) {
  const videoId = useMemo(() => getVideoId(videoUrl), [videoUrl]);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const [activeSegment, setActiveSegment] = useState(0);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef(null);

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
    const seg = segments[index];
    if (seg?.seconds != null) {
      videoRef.current?.seekTo(seg.seconds);
    }
  }

  if (!result && !loading) {
    return (
      <div className="relative z-10 mx-auto max-w-4xl space-y-10 py-4">
        <div className="relative text-center">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary-container/8 blur-[100px]" />
          <h1 className="text-3xl font-bold tracking-tight text-on-surface md:text-5xl">
            Paste a video. Get a clean{' '}
            <span className="text-gradient-primary">transcript</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-on-surface-variant">
            Drop any YouTube URL, Shorts link, share link, or video ID. Your transcripts are saved
            to your workspace.
          </p>
        </div>

        <form onSubmit={onGenerate} className="w-full max-w-3xl mx-auto">
          <div className="glass-panel flex flex-col items-stretch gap-2 rounded-full p-2 shadow-[0_4px_24px_0_rgba(0,0,0,0.4)] transition-shadow duration-300 hover:shadow-[0_4px_28px_0_rgba(124,58,237,0.15)] sm:flex-row sm:items-center">
            <div className="relative flex flex-1 items-center">
              <Icon
                name="link"
                className="pointer-events-none absolute left-5 text-outline"
              />
              <input
                ref={inputRef}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className="glass-input h-14 w-full rounded-full border-none bg-transparent py-4 pl-14 pr-4 text-base text-on-surface placeholder:text-outline focus:ring-0"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !videoId}
              className="btn-pulse flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-accent px-8 text-sm font-bold tracking-wide text-on-primary-container disabled:opacity-50"
            >
              {loading ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="auto_awesome" className="text-xl" />
              )}
              Generate
            </button>
          </div>
          {thumbnail && (
            <img
              src={thumbnail}
              alt=""
              className="mt-6 aspect-video w-full rounded-3xl border border-white/10 object-cover"
            />
          )}
        </form>

        {message && (
          <p className="rounded-2xl border border-error/30 bg-error-container/30 px-4 py-3 text-center text-sm text-error">
            {message}
          </p>
        )}

        {!session && (
          <p className="text-center text-sm text-on-surface-variant">
            Log in to save transcripts and unlock your workspace history.
          </p>
        )}

        <FeatureCards />
      </div>
    );
  }

  const displayTitle = result?.title || 'Current Transcript';
  const activeVideoId = result?.video_id || videoId;

  return (
    <div className="relative z-10 mx-auto max-w-[1600px] space-y-6">
      {!result && loading && (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
          <h3 className="text-lg font-semibold">Transcribing your video…</h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            This may take 20–40 seconds for longer videos.
          </p>
        </div>
      )}

      {message && (
        <p className="rounded-2xl border border-error/30 bg-error-container/30 px-4 py-3 text-sm text-error">
          {message}
        </p>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-7">
            <VideoPlayer
              ref={videoRef}
              key={activeVideoId}
              videoId={activeVideoId}
              title={displayTitle}
              videoUrl={result.video_url}
            />

            <TranscriptSummaryCard summary={videoSummary} />
          </div>

          <div className="flex min-h-[600px] flex-col lg:col-span-5">
            <div className="glass-panel flex h-full flex-col overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/5 p-4">
                <h3 className="text-lg font-semibold text-on-surface">Transcript</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={copyTranscript}
                    className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
                    title="Copy"
                  >
                    <Icon name={copied ? 'check' : 'content_copy'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTranscriptTxt(result)}
                    className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
                    title="Download TXT"
                  >
                    <Icon name="description" />
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTranscriptPdf(result)}
                    className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
                    title="Export PDF"
                  >
                    <Icon name="picture_as_pdf" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
                {filteredSegments.length ? (
                  filteredSegments.map((seg) => {
                    const segIndex = segments.indexOf(seg);
                    const isActive = segIndex === activeSegment;
                    return (
                      <button
                        key={`${seg.id}-${seg.time}`}
                        type="button"
                        onClick={() => handleSegmentClick(segIndex)}
                        className={`w-full rounded-2xl p-3 text-left transition-all ${
                          isActive
                            ? 'border border-primary/30 bg-primary/10 shadow-[0_0_16px_rgba(221,183,255,0.12)]'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              isActive
                                ? 'bg-primary-container/40 text-primary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {seg.time}
                          </span>
                          {isActive && (
                            <span className="animate-pulse text-[10px] font-bold uppercase text-primary">
                              Playing
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${
                            isActive ? 'text-on-surface' : 'text-on-surface/70'
                          }`}
                        >
                          {seg.body}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-on-surface-variant">
                    No matching text.
                  </p>
                )}
              </div>

              <div className="border-t border-white/5 bg-surface-container-low/50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={copyTranscript}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary/20 py-3 font-bold text-primary transition-colors hover:bg-primary/10"
                  >
                    <Icon name="content_copy" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTranscriptTxt(result)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 font-bold text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    <Icon name="description" />
                    TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTranscriptPdf(result)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-accent py-3 font-bold text-on-primary-container"
                  >
                    <Icon name="picture_as_pdf" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && result && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl px-8 py-6">
            <Icon name="progress_activity" className="mx-auto animate-spin text-4xl text-primary" />
            <p className="mt-3 text-sm font-semibold">Updating transcript…</p>
          </div>
        </div>
      )}
    </div>
  );
}
