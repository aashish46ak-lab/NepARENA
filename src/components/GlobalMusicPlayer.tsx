/**
 * Persistent floating music player (bottom-left rotating disc).
 * Survives route changes; only stops on pause / close.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MUSIC_CATEGORIES,
  type MusicCategoryId,
  type Track,
  getCategory,
} from "@/lib/music-catalog";
import { cn } from "@/lib/utils";
import {
  Pause,
  Play,
  SkipForward,
  X,
  Music2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const LS_KEY = "neparena_music_v1";

type Persisted = {
  categoryId: MusicCategoryId;
  trackId: string;
  playing: boolean;
  volume: number;
};

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

export function GlobalMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [categoryId, setCategoryId] = useState<MusicCategoryId>("lofi");
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setCategoryId(saved.categoryId);
      setVolume(saved.volume ?? 0.7);
      const cat = getCategory(saved.categoryId);
      const tr = cat?.tracks.find((x) => x.id === saved.trackId) ?? cat?.tracks[0] ?? null;
      setTrack(tr);
      if (saved.playing && tr) {
        setOpen(true);
        setPlaying(true);
      }
    }
  }, []);

  useEffect(() => {
    const h = () => {
      setOpen(true);
      setPanel(true);
      if (!track) {
        const cat = getCategory(categoryId);
        setTrack(cat?.tracks[0] ?? null);
      }
    };
    window.addEventListener("neparena-open-music", h);
    return () => window.removeEventListener("neparena-open-music", h);
  }, [track, categoryId]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.preload = "metadata";
    }
    const a = audioRef.current;
    a.volume = volume;
    if (track?.src && a.src !== track.src) {
      a.src = track.src;
      if (playing) void a.play().catch(() => setPlaying(false));
    }
  }, [track, volume, playing]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      void a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
    }
  }, [playing]);

  useEffect(() => {
    if (!track) return;
    saveState({ categoryId, trackId: track.id, playing, volume });
  }, [categoryId, track, playing, volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => nextTrack();
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, categoryId]);

  const pickCategory = useCallback((id: MusicCategoryId) => {
    setCategoryId(id);
    const cat = getCategory(id);
    const t = cat?.tracks[0] ?? null;
    setTrack(t);
    setOpen(true);
    setPlaying(!!t);
  }, []);

  const nextTrack = useCallback(() => {
    const cat = getCategory(categoryId);
    if (!cat?.tracks.length) return;
    const idx = cat.tracks.findIndex((t) => t.id === track?.id);
    const next = cat.tracks[(idx + 1) % cat.tracks.length];
    setTrack(next);
    setPlaying(true);
  }, [categoryId, track]);

  const close = () => {
    setPlaying(false);
    setOpen(false);
    setPanel(false);
    audioRef.current?.pause();
    saveState({ categoryId, trackId: track?.id ?? "", playing: false, volume });
  };

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 left-4 z-[60] flex flex-col items-start gap-2 sm:bottom-6 sm:left-6">
        {open && track && (
          <div className="pointer-events-auto flex max-w-[220px] items-center gap-2 rounded-2xl border border-white/15 bg-black/80 px-2.5 py-2 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-lg"
              aria-label={playing ? "Pause" : "Play"}
            >
              <span
                className={cn(
                  "absolute inset-0.5 rounded-full border-2 border-dashed border-white/40",
                  playing && "animate-spin",
                )}
                style={{ animationDuration: "3s" }}
              />
              {playing ? <Pause className="relative h-4 w-4" /> : <Play className="relative h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-white">{track.title}</p>
              <p className="truncate text-[10px] text-neutral-400">{track.artist}</p>
            </div>
            <button type="button" onClick={nextTrack} className="text-neutral-400 hover:text-white" aria-label="Next">
              <SkipForward className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setPanel((v) => !v)} className="text-neutral-400 hover:text-white" aria-label="Library">
              {panel ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button type="button" onClick={close} className="text-neutral-500 hover:text-rose-300" aria-label="Close music">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setPanel(true);
              if (!track) {
                const cat = getCategory(categoryId);
                setTrack(cat?.tracks[0] ?? null);
              }
            }}
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/75 text-sky-300 shadow-xl backdrop-blur-md hover:border-sky-400/40 hover:text-sky-200"
            aria-label="Play music"
            title="Play music"
          >
            <Music2 className="h-5 w-5" />
          </button>
        )}

        {panel && (
          <div className="pointer-events-auto w-[min(92vw,280px)] rounded-2xl border border-white/15 bg-[#0c0c0c]/95 p-3 shadow-2xl backdrop-blur-md">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Choose genre</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {MUSIC_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCategory(c.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                    categoryId === c.id ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-300 hover:bg-white/10",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {(getCategory(categoryId)?.tracks ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTrack(t);
                    setPlaying(true);
                    setOpen(true);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-white/5",
                    track?.id === t.id && "bg-sky-500/15 text-sky-100",
                  )}
                >
                  <Play className="h-3 w-3 shrink-0 opacity-60" />
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-neutral-500">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-full accent-sky-500"
              />
            </div>
            <p className="mt-2 text-[9px] leading-snug text-neutral-600">
              Demo tracks under free licenses. Replace with properly licensed music for commercial Nepali / Hindi / English hits.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export function openMusicPicker() {
  window.dispatchEvent(new CustomEvent("neparena-open-music"));
}

export function useMusicOpenListener(onOpen: () => void) {
  useEffect(() => {
    const h = () => onOpen();
    window.addEventListener("neparena-open-music", h);
    return () => window.removeEventListener("neparena-open-music", h);
  }, [onOpen]);
}
