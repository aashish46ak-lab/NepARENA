/**
 * NepARENA Music — official YouTube IFrame API (real songs only).
 * Player stays in-viewport (YouTube policy) so play() works.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GENRES,
  getGenreTracks,
  genreLabel,
  pickRandomTrack,
  youtubeThumb,
  youtubeWatchUrl,
  type MusicGenreId,
  type Track,
} from "@/lib/music-catalog";
import { cn } from "@/lib/utils";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
  Music2,
  Volume2,
  VolumeX,
  ExternalLink,
  Maximize2,
} from "lucide-react";

const LS_KEY = "neparena_music_yt_v2";
const POS_KEY = "neparena_music_pos_v1";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
            onError?: (e: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (id: string | { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (id: string | { videoId: string }) => void;
  setVolume: (v: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type Persisted = {
  genreId: MusicGenreId;
  trackId: string;
  volume: number;
  active: boolean;
};

type Pos = { x: number; y: number };

type MusicApi = {
  active: boolean;
  playing: boolean;
  track: Track | null;
  genreId: MusicGenreId;
  volume: number;
  progress: number;
  duration: number;
  sheetOpen: boolean;
  expanded: boolean;
  ready: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  selectGenre: (id: MusicGenreId) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  seek: (t: number) => void;
  closePlayer: () => void;
  setExpanded: (v: boolean) => void;
};

const MusicCtx = createContext<MusicApi | null>(null);

function loadState(): Persisted | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function saveState(s: Persisted) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pos;
  } catch {
    return null;
  }
}

function savePos(p: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function EqualizerBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-5 items-end gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full bg-sky-400/90", playing ? "" : "opacity-40")}
          style={{
            height: playing ? 10 + i * 2 : 6,
            animationName: playing ? "neparena-eq" : undefined,
            animationDuration: `${0.4 + i * 0.12}s`,
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            animationTimingFunction: "ease-in-out",
          }}
        />
      ))}
      <style>{`
        @keyframes neparena-eq {
          0% { height: 4px; }
          100% { height: 18px; }
        }
      `}</style>
    </div>
  );
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
    const check = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(check);
        resolve();
      }
    }, 80);
    window.setTimeout(() => {
      window.clearInterval(check);
      resolve();
    }, 10000);
  });
  return ytApiPromise;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const trackRef = useRef<Track | null>(null);
  const genreRef = useRef<MusicGenreId>("trending");
  const pendingPlayRef = useRef<Track | null>(null);
  const volumeRef = useRef(80);
  const errorSkipsRef = useRef(0);

  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [genreId, setGenreId] = useState<MusicGenreId>("trending");
  const [volume, setVolumeState] = useState(80);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  trackRef.current = track;
  genreRef.current = genreId;
  volumeRef.current = volume;

  const doLoadAndPlay = useCallback((t: Track) => {
    const p = playerRef.current;
    if (!p) {
      pendingPlayRef.current = t;
      return;
    }
    try {
      p.setVolume(volumeRef.current);
      p.unMute();
      p.loadVideoById({ videoId: t.youtubeId, startSeconds: 0 });
      window.setTimeout(() => {
        try {
          p.playVideo();
        } catch {
          /* ignore */
        }
      }, 120);
      setPlaying(true);
      setActive(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadYouTubeApi();
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(hostRef.current, {
        height: "180",
        width: "320",
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volumeRef.current);
            setReady(true);
            const pending = pendingPlayRef.current;
            if (pending) {
              pendingPlayRef.current = null;
              setTrack(pending);
              setGenreId(pending.genre);
              setActive(true);
              try {
                e.target.setVolume(volumeRef.current);
                e.target.unMute();
                e.target.loadVideoById(pending.youtubeId);
                window.setTimeout(() => {
                  try {
                    e.target.playVideo();
                  } catch {
                    /* ignore */
                  }
                }, 150);
              } catch {
                /* ignore */
              }
              return;
            }
            const saved = loadState();
            if (saved?.active) {
              setGenreId(saved.genreId);
              setVolumeState(saved.volume ?? 80);
              const list = getGenreTracks(saved.genreId);
              const exact =
                list.find((x) => x.id === saved.trackId) ?? pickRandomTrack(saved.genreId);
              if (exact) {
                setTrack(exact);
                setActive(true);
                e.target.cueVideoById(exact.youtubeId);
                e.target.setVolume(saved.volume ?? 80);
              }
            }
          },
          onStateChange: (e) => {
            const YT = window.YT;
            if (!YT) return;
            if (e.data === YT.PlayerState.PLAYING) {
              setPlaying(true);
              setActive(true);
              errorSkipsRef.current = 0;
            } else if (e.data === YT.PlayerState.PAUSED) {
              setPlaying(false);
            } else if (e.data === YT.PlayerState.ENDED) {
              setPlaying(false);
              const n = pickRandomTrack(genreRef.current, trackRef.current?.id);
              if (n) {
                setTrack(n);
                doLoadAndPlay(n);
              }
            }
          },
          onError: () => {
            errorSkipsRef.current += 1;
            if (errorSkipsRef.current > 6) return;
            const n = pickRandomTrack(genreRef.current, trackRef.current?.id);
            if (n) {
              setTrack(n);
              doLoadAndPlay(n);
            }
          },
        },
      });
    })();
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [doLoadAndPlay]);

  useEffect(() => {
    saveState({
      genreId,
      trackId: track?.id ?? "",
      volume,
      active,
    });
  }, [genreId, track, volume, active]);

  useEffect(() => {
    if (playerRef.current && ready) {
      try {
        playerRef.current.setVolume(volume);
        if (volume === 0) playerRef.current.mute();
        else playerRef.current.unMute();
      } catch {
        /* ignore */
      }
    }
  }, [volume, ready]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        setProgress(p.getCurrentTime() || 0);
        setDuration(p.getDuration() || 0);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [playing, track]);

  const playTrack = useCallback(
    (t: Track) => {
      setActive(true);
      setTrack(t);
      setGenreId(t.genre);
      setExpanded(true);
      if (!playerRef.current || !ready) {
        pendingPlayRef.current = t;
        return;
      }
      doLoadAndPlay(t);
    },
    [doLoadAndPlay, ready],
  );

  const selectGenre = useCallback(
    (id: MusicGenreId) => {
      setGenreId(id);
      setSheetOpen(false);
      const nextT = pickRandomTrack(id, track?.id);
      if (nextT) playTrack(nextT);
    },
    [playTrack, track?.id],
  );

  const next = useCallback(() => {
    const n = pickRandomTrack(genreId, track?.id);
    if (n) playTrack(n);
  }, [genreId, playTrack, track?.id]);

  const prev = useCallback(() => {
    const p = playerRef.current;
    if (p) {
      try {
        if (p.getCurrentTime() > 3) {
          p.seekTo(0, true);
          setProgress(0);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    const n = pickRandomTrack(genreId, track?.id);
    if (n) playTrack(n);
  }, [genreId, playTrack, track?.id]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || !track) return;
    try {
      if (playing) {
        p.pauseVideo();
        setPlaying(false);
      } else {
        p.playVideo();
        setPlaying(true);
      }
    } catch {
      setPlaying(false);
    }
  }, [playing, track]);

  const closePlayer = useCallback(() => {
    try {
      playerRef.current?.stopVideo();
    } catch {
      /* ignore */
    }
    pendingPlayRef.current = null;
    setPlaying(false);
    setActive(false);
    setExpanded(false);
    setSheetOpen(false);
  }, []);

  const seek = useCallback((t: number) => {
    try {
      playerRef.current?.seekTo(t, true);
      setProgress(t);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const h = () => setSheetOpen(true);
    window.addEventListener("neparena-open-music", h);
    return () => window.removeEventListener("neparena-open-music", h);
  }, []);

  const api: MusicApi = useMemo(
    () => ({
      active,
      playing,
      track,
      genreId,
      volume,
      progress,
      duration,
      sheetOpen,
      expanded,
      ready,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
      selectGenre,
      togglePlay,
      next,
      prev,
      setVolume: setVolumeState,
      seek,
      closePlayer,
      setExpanded,
    }),
    [
      active,
      playing,
      track,
      genreId,
      volume,
      progress,
      duration,
      sheetOpen,
      expanded,
      ready,
      selectGenre,
      togglePlay,
      next,
      prev,
      seek,
      closePlayer,
    ],
  );

  return (
    <MusicCtx.Provider value={api}>
      <div
        className={cn(
          "fixed z-[72] overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl transition-all",
          active
            ? "pointer-events-auto bottom-20 right-3 h-[160px] w-[280px] opacity-100 sm:bottom-6 sm:right-6"
            : "pointer-events-none -left-[400px] top-0 h-[180px] w-[320px] opacity-0",
        )}
        aria-hidden={!active}
      >
        <div ref={hostRef} id="neparena-yt-host" className="h-full w-full" />
        {active && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white/80 hover:bg-black/80"
            aria-label="Expand player"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </MusicCtx.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
}

export function useMusicOptional() {
  return useContext(MusicCtx);
}

export function HomeMusicCard() {
  const music = useMusicOptional();
  if (!music) return null;

  return (
    <button
      type="button"
      onClick={() => music.openSheet()}
      className="group relative mt-4 w-full overflow-hidden rounded-[22px] border border-white/15 bg-gradient-to-br from-black/80 via-[#0c0c12]/90 to-black/70 px-4 py-3.5 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-sky-400/35 hover:shadow-[0_0_28px_rgba(56,189,248,0.18)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.12),transparent_55%)]" />
      <div className="relative flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-sky-300">
          <Music2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-white">NepARENA Music</p>
          <p className="text-xs text-neutral-400">Real songs · official YouTube</p>
        </div>
        <EqualizerBars playing={music.playing && music.active} />
      </div>
      {music.active && music.track && (
        <p className="relative mt-2 truncate text-[11px] text-neutral-500">
          {music.playing ? "Now playing" : "Paused"} · {music.track.title} — {music.track.artist}
        </p>
      )}
    </button>
  );
}

function GenreSheet() {
  const music = useMusic();
  if (!music.sheetOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => music.closeSheet()}
      />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/15 bg-[#0c0c0e]/97 p-5 shadow-2xl backdrop-blur-xl sm:rounded-[28px]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Pick a vibe</h2>
            <p className="text-xs text-neutral-500">
              {music.ready ? "Official songs via YouTube" : "Loading player…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => music.closeSheet()}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GENRES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => music.selectGenre(g.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border px-3 py-3 text-left transition",
                music.genreId === g.id && music.active
                  ? "border-sky-400/50 bg-sky-500/15"
                  : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]",
              )}
            >
              <span className="text-xl">{g.emoji}</span>
              <span className="text-sm font-medium text-neutral-100">{g.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingDisc() {
  const music = useMusic();
  const discRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos>(() => loadPos() ?? { x: 16, y: -1 });
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number; moved: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (pos.y < 0 && typeof window !== "undefined") {
      setPos({ x: 16, y: Math.max(80, window.innerHeight - 100) });
    }
  }, [pos.y]);

  if (!music.active || !music.track) return null;

  const thumb = youtubeThumb(music.track.youtubeId);

  const onPointerDown = (e: React.PointerEvent) => {
    if (music.expanded) return;
    const el = discRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    drag.current = {
      ox: e.clientX,
      oy: e.clientY,
      sx: pos.x,
      sy: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.ox;
    const dy = e.clientY - drag.current.oy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    const nx = Math.max(8, Math.min(window.innerWidth - 64, drag.current.sx + dx));
    const ny = Math.max(8, Math.min(window.innerHeight - 64, drag.current.sy + dy));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    savePos(pos);
    if (!moved) music.setExpanded(true);
  };

  return (
    <>
      {!music.expanded && (
        <div
          ref={discRef}
          className="fixed z-[70] touch-none"
          style={{ left: pos.x, top: pos.y }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <button
            type="button"
            className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-white/20 bg-black/80 shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-md"
            aria-label="Open music player"
          >
            <span
              className={cn(
                "absolute inset-[3px] rounded-full border-2 border-dashed border-sky-300/50",
                music.playing && "animate-spin",
              )}
              style={{ animationDuration: "4s" }}
            />
            <img
              src={thumb}
              alt=""
              className={cn("h-9 w-9 rounded-full object-cover", music.playing && "animate-spin")}
              style={{ animationDuration: "8s" }}
              draggable={false}
            />
          </button>
        </div>
      )}

      {music.expanded && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Minimize"
            onClick={() => music.setExpanded(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-t-[28px] border border-white/15 bg-[#0a0a0c]/97 p-5 shadow-2xl backdrop-blur-xl sm:rounded-[28px]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <div className="flex items-start gap-4">
              <img
                src={thumb}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-white/15"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{music.track.title}</p>
                <p className="truncate text-sm text-neutral-400">{music.track.artist}</p>
                <p className="mt-1 text-[11px] text-sky-300/90">{genreLabel(music.genreId)}</p>
              </div>
              <button
                type="button"
                onClick={() => music.closePlayer()}
                className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 hover:bg-white/10 hover:text-rose-300"
                aria-label="Close player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-[11px] text-neutral-500">
              Video plays in the bottom-right YouTube window (required for sound).
            </p>

            <div className="mt-3">
              <input
                type="range"
                min={0}
                max={music.duration || 100}
                step={0.1}
                value={music.progress}
                onChange={(e) => music.seek(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-sky-400"
              />
              <div className="mt-1 flex justify-between text-[10px] tabular-nums text-neutral-500">
                <span>{formatTime(music.progress)}</span>
                <span>{formatTime(music.duration)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => music.prev()}
                className="grid h-10 w-10 place-items-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white"
                aria-label="Previous"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => music.togglePlay()}
                className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-lg shadow-sky-500/25"
                aria-label={music.playing ? "Pause" : "Play"}
              >
                {music.playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 pl-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => music.next()}
                className="grid h-10 w-10 place-items-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white"
                aria-label="Next"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => music.setVolume(music.volume > 0 ? 0 : 80)}
                className="text-neutral-400 hover:text-white"
              >
                {music.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={music.volume}
                onChange={(e) => music.setVolume(Number(e.target.value))}
                className="h-1 w-full accent-sky-400"
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  music.setExpanded(false);
                  music.openSheet();
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/[0.08]"
              >
                Change genre
              </button>
              <a
                href={youtubeWatchUrl(music.track.youtubeId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/[0.08]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                YouTube
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function GlobalMusicPlayer() {
  const music = useMusicOptional();
  if (!music) return null;
  return (
    <>
      <GenreSheet />
      <FloatingDisc />
    </>
  );
}

export function openMusicPicker() {
  window.dispatchEvent(new CustomEvent("neparena-open-music"));
}
