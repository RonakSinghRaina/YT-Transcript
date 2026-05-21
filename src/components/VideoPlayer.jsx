import { useState } from 'react';
import Icon from './Icon';

export default function VideoPlayer({ videoId, title, videoUrl }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
    : null;
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const watchUrl = videoUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);

  if (!videoId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-3xl bg-black text-white/50">
        <Icon name="play_circle" className="text-6xl" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-ambient">
      <div className="relative aspect-video bg-black">
        {playing && embedUrl ? (
          <iframe
            title={title || 'YouTube video'}
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <>
            {thumb && (
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover opacity-90"
              />
            )}
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
              aria-label="Play video"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/90 text-white shadow-xl transition-transform hover:scale-110">
                <Icon name="play_arrow" fill className="text-5xl" />
              </span>
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <span className="mb-2 inline-block rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                Captions
              </span>
              {title && (
                <h2 className="text-xl font-semibold leading-tight text-white">{title}</h2>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant/10 p-4">
        <div className="flex items-center gap-4 text-secondary">
          {playing ? (
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="flex items-center gap-1 text-xs font-semibold uppercase hover:text-primary"
            >
              <Icon name="stop" className="text-lg" />
              Show thumbnail
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold uppercase">
              <Icon name="schedule" className="text-lg" />
              Saved
            </span>
          )}
        </div>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            <Icon name="open_in_new" className="text-lg" />
            Open on YouTube
          </a>
        )}
      </div>
    </div>
  );
}
