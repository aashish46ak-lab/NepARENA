/**
 * NepARENA global music system
 * - HomeMusicCard: fixed on homepage only (below About / Feed)
 * - Genre bottom sheet
 * - Floating rotating disc ONLY after music starts (draggable, persists position)
 * - Expanded mini player
 * - Dual-audio crossfade, random track per genre, legal free streams only
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
} from "lucide-react";

const LS_KEY = "neparena_music_v2";
const POS_KEY = "neparena_music_pos_v1";
const FADE_MS = 700;

type Persisted = {
  genreId: MusicGenreId;
  trackId: string;
  playing: boolean;
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

export function MusicProvider({ children }: { children: ReactNode }) {
  const a1 = useRef<HTMLAudioElement | null>(null);
  const a2 = useRef<HTMLAudioElement | null>(null);
  const activeAudio = useRef<0 | 1>(0);
  const fading = useRef(false);

  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [genreId, setGenreId] = useState<MusicGenreId>("lofi");
  const [volume, setVolumeState] = useState(0.75);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    a1.current = new Audio();
    a2.current = new Audio();
    for (const a of [a1.current, a2.current]) {
      a.crossOrigin = "anonymous";
      a.preload = "auto";
      a.volume = 0.75;
    }
    setHydrated(true);
    return () => {
      a1.current?.pause();
      a2.current?.pause();
      a1.current = null;
      a2.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saved = loadState();
    if (!saved?.active) return;
    setGenreId(saved.genreId);
    setVolumeState(saved.volume ?? 0.75);
    const list = getGenreTracks(saved.genreId);
    const exact = list.find((x) => x.id === saved.trackId) ?? pickRandomTrack(saved.genreId);
    if (exact) {
      setTrack(exact);
      setActive(true);
      setPlaying(false);
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveState({
      genreId,
      trackId: track?.id ?? "",
      playing,
      volume,
      active,
    });
  }, [genreId, track, playing, volume, active, hydrated]);

  useEffect(() => {
    if (a1.current) a1.current.volume = volume;
    if (a2.current) a2.current.volume = volume;
  }, [volume]);

  const currentEl = useCallback(() => {
    return activeAudio.current === 0 ? a1.current : a2.current;
  }, []);

  const otherEl = useCallback(() => {
    return activeAudio.current === 0 ? a2.current : a1.current;
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const el = currentEl();
      if (el) {
        setProgress(el.currentTime || 0);
        setDuration(el.duration || 0);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, currentEl, track]);

  const fadeCross = useCallback(
    async (nextTrack: Track) => {
      if (fading.current) return;
      fading.current = true;
      const cur = currentEl();
      const nxt = otherEl();
      if (!cur || !nxt) {
        fading.current = false;
        return;
      }

      nxt.src = nextTrack.src;
      nxt.volume = 0;
      try {
        await nxt.play();
      } catch {
        fading.current = false;
        setPlaying(false);
        return;
      }

      const steps = 14;
      const stepMs = FADE_MS / steps;
      const startVol = cur.volume;
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, stepMs));
        const t = i / steps;
        cur.volume = startVol * (1 - t);
        nxt.volume = volume * t;
      }
      cur.pause();
      cur.currentTime = 0;
      cur.volume = volume;
      nxt.volume = volume;
      activeAudio.current = activeAudio.current === 0 ? 1 : 0;
      setTrack(nextTrack);
      setProgress(0);
      setDuration(nxt.duration || 0);
      fading.current = false;
    },
    [currentEl, otherEl, volume],
  );

  const playTrack = useCallback(
    async (t: Track, crossfade: boolean) => {
      setActive(true);
      setTrack(t);
      const el = currentEl();
      if (!el) return;

      if (crossfade && playing && el.src && el.src !== t.src) {
        await fadeCross(t);
        setPlaying(true);
        return;
      }

      if (el.src !== t.src) {
        el.src = t.src;
      }
      el.volume = volume;
      try {
        await el.play();
        setPlaying(true);
      } catch {
        const alt = pickRandomTrack(t.genre, t.id);
        if (alt && alt.id !== t.id) {
          el.src = alt.src;
          try {
            await el.play();
            setTrack(alt);
            setPlaying(true);
          } catch {
            setPlaying(false);
          }
        } else {
          setPlaying(false);
        }
      }
    },
    [currentEl, fadeCross, playing, volume],
  );

  const selectGenre = useCallback(
    (id: MusicGenreId) => {
      setGenreId(id);
      setSheetOpen(false);
      const nextT = pickRandomTrack(id, track?.id);
      if (nextT) void playTrack(nextT, true);
    },
    [playTrack, track?.id],
  );

  const next = useCallback(() => {
    const n = pickRandomTrack(genreId, track?.id);
    if (n) void playTrack(n, true);
  }, [genreId, playTrack, track?.id]);

  const prev = useCallback(() => {
    const el = currentEl();
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      setProgress(0);
      return;
    }
    const n = pickRandomTrack(genreId, track?.id);
    if (n) void playTrack(n, true);
  }, [currentEl, genreId, playTrack, track?.id]);

  const togglePlay = useCallback(() => {
    const el = currentEl();
    if (!el || !track) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [currentEl, playing, track]);

  const closePlayer = useCallback(() => {
    a1.current?.pause();
    a2.current?.pause();
    setPlaying(false);
    setActive(false);
    setExpanded(false);
    setSheetOpen(false);
  }, []);

  const seek = useCallback(
    (t: number) => {
      const el = currentEl();
      if (el && Number.isFinite(t)) {
        el.currentTime = t;
        setProgress(t);
      }
    },
    [currentEl],
  );

  useEffect(() => {
    const onEnded = () => next();
    const el1 = a1.current;
    const el2 = a2.current;
    el1?.addEventListener("ended", onEnded);
    el2?.addEventListener("ended", onEnded);
    return () => {
      el1?.removeEventListener("ended", onEnded);
      el2?.removeEventListener("ended", onEnded);
    };
  }, [next, hydrated]);

  useEffect(() => {
    const onErr = () => next();
    a1.current?.addEventListener("error", onErr);
    a2.current?.addEventListener("error", onErr);
    return () => {
      a1.current?.removeEventListener("error", onErr);
      a2.current?.removeEventListener("error", onErr);
    };
  }, [next, hydrated]);

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
      selectGenre,
      togglePlay,
      next,
      prev,
      seek,
      closePlayer,
    ],
  );

  return <MusicCtx.Provider value={api}>{children}</MusicCtx.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
}

export function useMusicOptional() {
  return useContext(MusicCtx);
}

/** Home page fixed card (NOT floating) */
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
          <p className="text-xs text-neutral-400">Choose a vibe while you browse.</p>
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
            <p className="text-xs text-neutral-500">Instant random track · legal free streams</p>
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
              src={music.track.cover || "/neparena-logo.png"}
              alt=""
              className={cn("h-9 w-9 rounded-full object-cover", music.playing && "animate-spin")}
              style={{ animationDuration: "8s" }}
              draggable={false}
            />
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-sky-400/40" />
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
                src={music.track.cover || "/neparena-logo.png"}
                alt=""
                className={cn(
                  "h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-white/15",
                  music.playing && "animate-spin",
                )}
                style={{ animationDuration: "12s" }}
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

            <div className="mt-4">
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
                onClick={() => music.setVolume(music.volume > 0 ? 0 : 0.75)}
                className="text-neutral-400 hover:text-white"
              >
                {music.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={music.volume}
                onChange={(e) => music.setVolume(Number(e.target.value))}
                className="h-1 w-full accent-sky-400"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                music.setExpanded(false);
                music.openSheet();
              }}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/[0.08]"
            >
              Change genre
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Mount once in root — sheet + floating disc */
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
