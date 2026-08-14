import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { buildSeoHead } from "@/lib/seo";
import {
  GENRES,
  formatDuration,
  genreStats,
  getGenreTracks,
  youtubeThumb,
  type MusicGenreId,
  type Track,
} from "@/lib/music-catalog";
import { useMusicOptional } from "@/components/GlobalMusicPlayer";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pause, Play, Search, Music2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/music")({
  head: () => ({
    ...buildSeoHead({
      title: "NepARENA Music",
      description: "Listen to real songs on NepARENA — official YouTube playback",
      path: "/music",
    }),
  }),
  component: MusicPage,
});

function MusicPage() {
  const music = useMusicOptional();
  const [q, setQ] = useState("");
  const [activeGenre, setActiveGenre] = useState<MusicGenreId | null>(null);

  const genres = useMemo(
    () => GENRES.filter((g) => g.id !== "random" || getGenreTracks("random").length > 0),
    [],
  );

  const tracks = useMemo(() => {
    if (!activeGenre) return [] as Track[];
    let list = getGenreTracks(activeGenre);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(s) || t.artist.toLowerCase().includes(s),
      );
    }
    return list;
  }, [activeGenre, q]);

  const playTrack = (t: Track) => {
    music?.playTrack?.(t);
  };

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-screen bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
            <Link
              to="/"
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-300 hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-white">NepARENA Music</h1>
              <p className="text-[11px] text-neutral-500">Official YouTube · real songs</p>
            </div>
            <Music2 className="h-5 w-5 text-sky-400" />
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 pb-28 pt-5">
          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search songs or artists…"
              className="h-11 rounded-2xl border-white/10 bg-white/[0.05] pl-10 text-sm"
            />
          </div>

          {!activeGenre ? (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Browse genres
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {genres.map((g) => {
                  const st = genreStats(g.id);
                  const first = getGenreTracks(g.id)[0];
                  const cover = first ? youtubeThumb(first.youtubeId) : "/neparena-logo.png";
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveGenre(g.id)}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border border-white/10 p-3 text-left transition hover:border-white/25",
                        `bg-gradient-to-br ${g.color}`,
                      )}
                    >
                      <div className="absolute -right-2 -top-2 h-16 w-16 overflow-hidden rounded-full opacity-40">
                        <img src={cover} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="relative text-2xl">{g.emoji}</span>
                      <p className="relative mt-2 text-sm font-semibold text-white">{g.label}</p>
                      <p className="relative mt-0.5 text-[11px] text-neutral-400">
                        {st.count} songs · {formatDuration(st.totalSec)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveGenre(null)}
                className="mb-3 text-sm text-sky-400 hover:text-sky-300"
              >
                ← All genres
              </button>
              <h2 className="mb-1 text-xl font-semibold text-white">
                {GENRES.find((g) => g.id === activeGenre)?.emoji}{" "}
                {GENRES.find((g) => g.id === activeGenre)?.label}
              </h2>
              <p className="mb-4 text-xs text-neutral-500">
                {tracks.length} tracks · tap to play
              </p>
              <div className="space-y-1">
                {tracks.map((t, i) => {
                  const isCurrent = music?.track?.id === t.id;
                  const isPlaying = isCurrent && music?.playing;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => playTrack(t)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/[0.06]",
                        isCurrent && "bg-sky-500/10",
                      )}
                    >
                      <span className="w-5 text-center text-xs tabular-nums text-neutral-600">
                        {i + 1}
                      </span>
                      <img
                        src={youtubeThumb(t.youtubeId)}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            isCurrent ? "text-sky-300" : "text-neutral-100",
                          )}
                        >
                          {t.title}
                        </p>
                        <p className="truncate text-xs text-neutral-500">{t.artist}</p>
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                        {formatDuration(t.durationSec)}
                      </span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-neutral-300">
                        {isPlaying ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5 pl-0.5" />
                        )}
                      </span>
                    </button>
                  );
                })}
                {tracks.length === 0 && (
                  <p className="py-10 text-center text-sm text-neutral-500">No songs match.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
