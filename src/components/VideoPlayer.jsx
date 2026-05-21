import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Icon from './Icon';

let ytApiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };

    if (!document.querySelector('script[data-yt-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.ytApi = '1';
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

const VideoPlayer = forwardRef(function VideoPlayer({ videoId, title, videoUrl }, ref) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const watchUrl = videoUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      const t = Math.max(0, Math.floor(seconds || 0));
      if (!playerRef.current?.seekTo) return;
      if (!playing) setPlaying(true);
      const seek = () => {
        try {
          playerRef.current.seekTo(t, true);
          playerRef.current.playVideo?.();
        } catch {
          /* player not ready */
        }
      };
      if (ready) seek();
      else {
        const id = setInterval(() => {
          if (playerRef.current?.seekTo) {
            clearInterval(id);
            seek();
          }
        }, 100);
        setTimeout(() => clearInterval(id), 5000);
      }
    },
  }));

  useEffect(() => {
    if (!videoId || !playing) return;

    let cancelled = false;
    let player;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;

      player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      setReady(false);
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId, playing]);

  useEffect(() => {
    setPlaying(false);
    setReady(false);
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="glass-panel flex aspect-video items-center justify-center rounded-3xl">
        <Icon name="play_circle" className="text-6xl text-outline" />
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden rounded-3xl shadow-[0_8px_32px_0_rgba(132,43,210,0.12)]">
      <div className="relative aspect-video bg-black">
        {playing ? (
          <div ref={hostRef} className="h-full w-full" title={title || 'YouTube video'} />
        ) : (
          <>
            {thumb && (
              <img src={thumb} alt="" className="h-full w-full object-cover opacity-90" />
            )}
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
              aria-label="Play video"
            >
              <span className="btn-pulse flex h-20 w-20 items-center justify-center rounded-full bg-gradient-accent text-on-primary-container shadow-lg">
                <Icon name="play_arrow" fill className="text-5xl text-white" />
              </span>
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <span className="mb-2 inline-block rounded bg-primary-container/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-primary">
                Captions
              </span>
              {title && (
                <h2 className="text-xl font-semibold leading-tight text-white">{title}</h2>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/5 p-4">
        <div className="flex items-center gap-4 text-on-surface-variant">
          {playing ? (
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="flex items-center gap-1 text-xs font-semibold uppercase transition-colors hover:text-primary"
            >
              <Icon name="stop" className="text-lg" />
              Show thumbnail
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold uppercase">
              <Icon name="schedule" className="text-lg" />
              Ready to play
            </span>
          )}
        </div>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary-fixed"
          >
            <Icon name="open_in_new" className="text-lg" />
            Open on YouTube
          </a>
        )}
      </div>
    </div>
  );
});

export default VideoPlayer;
