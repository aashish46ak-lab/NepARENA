/**
 * NepARENA Music — real commercial songs via official YouTube embeds.
 * Only verified video IDs. durationSec is known length (seconds).
 */
export type MusicGenreId =
  | "trending"
  | "nepali-90s"
  | "nepali-modern"
  | "english-90s"
  | "english-pop"
  | "hiphop"
  | "rap"
  | "lofi"
  | "edm"
  | "rock"
  | "hindi-classics"
  | "hindi-modern"
  | "phonk"
  | "chill"
  | "gaming"
  | "instrumental"
  | "random";

export type Track = {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  genre: MusicGenreId;
  durationSec: number;
};

export type Genre = {
  id: MusicGenreId;
  label: string;
  emoji: string;
  color: string;
};

export const GENRES: Genre[] = [
  { id: "trending", label: "Trending", emoji: "🔥", color: "from-orange-500/30 to-rose-500/20" },
  { id: "nepali-90s", label: "Nepali 90s", emoji: "📻", color: "from-amber-500/30 to-yellow-600/20" },
  { id: "nepali-modern", label: "Nepali Modern", emoji: "🏔️", color: "from-sky-500/30 to-cyan-600/20" },
  { id: "english-90s", label: "English 90s", emoji: "📼", color: "from-purple-500/30 to-violet-600/20" },
  { id: "english-pop", label: "English Pop", emoji: "🎤", color: "from-pink-500/30 to-fuchsia-600/20" },
  { id: "hiphop", label: "Hip-Hop", emoji: "🎧", color: "from-neutral-400/30 to-zinc-600/20" },
  { id: "rap", label: "Rap", emoji: "🎙️", color: "from-red-500/30 to-orange-600/20" },
  { id: "lofi", label: "Lo-fi", emoji: "☕", color: "from-teal-500/30 to-emerald-600/20" },
  { id: "edm", label: "EDM", emoji: "⚡", color: "from-blue-500/30 to-indigo-600/20" },
  { id: "rock", label: "Rock", emoji: "🎸", color: "from-rose-500/30 to-red-700/20" },
  { id: "hindi-classics", label: "Hindi Classics", emoji: "🎬", color: "from-yellow-500/30 to-amber-700/20" },
  { id: "hindi-modern", label: "Hindi Modern", emoji: "✨", color: "from-violet-500/30 to-purple-700/20" },
  { id: "phonk", label: "Phonk", emoji: "💀", color: "from-zinc-500/30 to-neutral-800/20" },
  { id: "chill", label: "Chill", emoji: "🌊", color: "from-cyan-500/30 to-blue-700/20" },
  { id: "gaming", label: "Gaming", emoji: "🎮", color: "from-lime-500/30 to-green-700/20" },
  { id: "instrumental", label: "Instrumental", emoji: "🎹", color: "from-slate-400/30 to-slate-700/20" },
  { id: "random", label: "Random Mix", emoji: "🎲", color: "from-sky-400/30 to-violet-600/20" },
];

function t(
  genre: MusicGenreId,
  items: [string, string, string, number][],
): Track[] {
  return items.map(([title, artist, youtubeId, durationSec], i) => ({
    id: `${genre}-${i}`,
    title,
    artist,
    youtubeId,
    genre,
    durationSec,
  }));
}

export const TRACKS_BY_GENRE: Record<MusicGenreId, Track[]> = {
  trending: t("trending", [
    ["Shape of You", "Ed Sheeran", "JGwWNGJdvx8", 263],
    ["Believer", "Imagine Dragons", "7wtfhZwyrcc", 217],
    ["Perfect", "Ed Sheeran", "2Vv-BfVoq4g", 263],
    ["Blinding Lights", "The Weeknd", "4NRXx6U8ABQ", 200],
    ["Faded", "Alan Walker", "60ItHLz5WEA", 212],
  ]),
  "nepali-90s": t("nepali-90s", [
    ["Gajalu Ti Thula Thula Aankha", "Ghulam Ali", "ftEzdVJWdDA", 293],
    ["Gajalu Ti Thula Thula Aankha (MV)", "Ghulam Ali / Music Nepal", "FvGqeHYN3HA", 441],
  ]),
  "nepali-modern": t("nepali-modern", [
    ["Maya Pirati", "Sagar Lamsal / Tilak Basnet", "Utsdzzmyf9s", 350],
    ["Maya Pirati (Cover)", "Trishna Gurung", "ptboVrLu3b0", 203],
  ]),
  "english-90s": t("english-90s", [
    ["Billie Jean", "Michael Jackson", "Zi_XLOBDo_Y", 294],
    ["Smells Like Teen Spirit", "Nirvana", "hTWKbfoikeg", 278],
    ["I Want It That Way", "Backstreet Boys", "4fndeDfaWCg", 213],
  ]),
  "english-pop": t("english-pop", [
    ["Perfect", "Ed Sheeran", "2Vv-BfVoq4g", 263],
    ["Shape of You", "Ed Sheeran", "JGwWNGJdvx8", 263],
    ["Someone Like You", "Adele", "hLQl3WQQoQ0", 285],
    ["Hello", "Adele", "YQHsXMglC9A", 367],
    ["Thinking Out Loud", "Ed Sheeran", "lp-EO5I60KA", 291],
  ]),
  hiphop: t("hiphop", [
    ["Lose Yourself", "Eminem", "_Yhyp-_hX2s", 326],
    ["Not Afraid", "Eminem", "j5-yKhDd64s", 258],
    ["God's Plan", "Drake", "xpVfcZ0ZcFM", 198],
  ]),
  rap: t("rap", [
    ["Without Me", "Eminem", "YVkUvmDQ3HY", 291],
    ["Rap God", "Eminem", "XbGs_oWdV9M", 364],
    ["In Da Club", "50 Cent", "5qm8PH4xAss", 250],
  ]),
  lofi: t("lofi", [
    ["lofi hip hop radio - beats to relax/study to", "Lofi Girl", "jfKfPfyJRdk", 0],
    ["1 A.M Study Session", "Lofi Girl", "lTRiuFIWV54", 0],
  ]),
  edm: t("edm", [
    ["Faded", "Alan Walker", "60ItHLz5WEA", 212],
    ["The Nights", "Avicii", "UtF6JciCApE", 176],
    ["Wake Me Up", "Avicii", "IcrbM1l_BoI", 247],
    ["Animals", "Martin Garrix", "gCYcHz2k5x0", 303],
  ]),
  rock: t("rock", [
    ["Believer", "Imagine Dragons", "7wtfhZwyrcc", 217],
    ["Radioactive", "Imagine Dragons", "ktvTqknDobU", 186],
    ["Sweet Child O' Mine", "Guns N' Roses", "1w7OgIMMRc4", 302],
    ["Bohemian Rhapsody", "Queen", "fJ9rUzIMcZQ", 354],
  ]),
  "hindi-classics": t("hindi-classics", [
    ["Kal Ho Naa Ho", "Sonu Nigam", "g0eO_AIczZM", 321],
  ]),
  "hindi-modern": t("hindi-modern", [
    ["Kesariya", "Arijit Singh", "BddP6PydY4M", 268],
  ]),
  phonk: t("phonk", [
    ["Murder In My Mind", "Kordhell", "p7FCgwRLGfQ", 145],
  ]),
  chill: t("chill", [
    ["Photograph", "Ed Sheeran", "nSDgHBxUbVQ", 258],
    ["Thinking Out Loud", "Ed Sheeran", "lp-EO5I60KA", 291],
    ["Someone Like You", "Adele", "hLQl3WQQoQ0", 285],
  ]),
  gaming: t("gaming", [
    ["Believer", "Imagine Dragons", "7wtfhZwyrcc", 217],
    ["Enemy", "Imagine Dragons & JID", "D9G1VOjN_84", 173],
    ["Natural", "Imagine Dragons", "V5M2WZiAy6k", 189],
  ]),
  instrumental: t("instrumental", [
    ["River Flows In You", "Yiruma", "7maJOI3QMu0", 188],
  ]),
  random: [],
};

TRACKS_BY_GENRE.random = Object.entries(TRACKS_BY_GENRE)
  .filter(([k]) => k !== "random")
  .flatMap(([, tracks]) => tracks)
  .map((tr, i) => ({ ...tr, id: `random-${i}`, genre: "random" as MusicGenreId }));

export function getGenreTracks(id: MusicGenreId): Track[] {
  return TRACKS_BY_GENRE[id] ?? [];
}

export function pickRandomTrack(
  genre: MusicGenreId,
  excludeId?: string | null,
): Track | null {
  const list = getGenreTracks(genre);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  let pick = list[Math.floor(Math.random() * list.length)];
  let guard = 0;
  while (excludeId && pick.id === excludeId && guard < 12) {
    pick = list[Math.floor(Math.random() * list.length)];
    guard++;
  }
  return pick;
}

export function genreLabel(id: MusicGenreId): string {
  return GENRES.find((g) => g.id === id)?.label ?? id;
}

export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function genreStats(id: MusicGenreId): { count: number; totalSec: number } {
  const list = getGenreTracks(id);
  return {
    count: list.length,
    totalSec: list.reduce((a, t) => a + (t.durationSec > 0 ? t.durationSec : 180), 0),
  };
}
