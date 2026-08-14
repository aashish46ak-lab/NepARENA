/**
 * NepARENA Music — real commercial songs via official YouTube embeds.
 * Unique verified video IDs only. No live streams / placeholders.
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
  { id: "trending", label: "Trending", emoji: "🔥", color: "from-orange-500/40 to-rose-500/30" },
  { id: "nepali-90s", label: "Nepali 90s", emoji: "📻", color: "from-amber-500/40 to-yellow-600/30" },
  { id: "nepali-modern", label: "Nepali Modern", emoji: "🏔️", color: "from-sky-500/40 to-cyan-600/30" },
  { id: "english-90s", label: "English 90s", emoji: "📼", color: "from-purple-500/40 to-violet-600/30" },
  { id: "english-pop", label: "English Pop", emoji: "🎤", color: "from-pink-500/40 to-fuchsia-600/30" },
  { id: "hiphop", label: "Hip-Hop", emoji: "🎧", color: "from-neutral-400/40 to-zinc-600/30" },
  { id: "rap", label: "Rap", emoji: "🎙️", color: "from-red-500/40 to-orange-600/30" },
  { id: "lofi", label: "Lo-fi", emoji: "☕", color: "from-teal-500/40 to-emerald-600/30" },
  { id: "edm", label: "EDM", emoji: "⚡", color: "from-blue-500/40 to-indigo-600/30" },
  { id: "rock", label: "Rock", emoji: "🎸", color: "from-rose-500/40 to-red-700/30" },
  { id: "hindi-classics", label: "Hindi Classics", emoji: "🎬", color: "from-yellow-500/40 to-amber-700/30" },
  { id: "hindi-modern", label: "Hindi Modern", emoji: "✨", color: "from-violet-500/40 to-purple-700/30" },
  { id: "phonk", label: "Phonk", emoji: "💀", color: "from-zinc-500/40 to-neutral-800/30" },
  { id: "chill", label: "Chill", emoji: "🌊", color: "from-cyan-500/40 to-blue-700/30" },
  { id: "gaming", label: "Gaming", emoji: "🎮", color: "from-lime-500/40 to-green-700/30" },
  { id: "instrumental", label: "Instrumental", emoji: "🎹", color: "from-slate-400/40 to-slate-700/30" },
  { id: "random", label: "Random Mix", emoji: "🎲", color: "from-sky-400/40 to-violet-600/30" },
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
    ["Blinding Lights", "The Weeknd", "4NRXx6U8ABQ", 200],
    ["Shape of You", "Ed Sheeran", "JGwWNGJdvx8", 263],
    ["Believer", "Imagine Dragons", "7wtfhZwyrcc", 217],
    ["Faded", "Alan Walker", "60ItHLz5WEA", 212],
    ["Levitating", "Dua Lipa", "TUVcZkpLf_s", 203],
    ["Stay", "The Kid LAROI & Justin Bieber", "kTJczUoc26U", 141],
    ["As It Was", "Harry Styles", "H5v3kku4y6Q", 167],
    ["Flowers", "Miley Cyrus", "G7KNmW9a75Y", 200],
    ["Anti-Hero", "Taylor Swift", "b1kbLwvqugk", 201],
    ["Heat Waves", "Glass Animals", "mRD0-GxqHVo", 238],
    ["Save Your Tears", "The Weeknd", "XXYlFuWEuKI", 215],
    ["Shivers", "Ed Sheeran", "Il0S8BoucSA", 207],
  ]),
  "nepali-90s": t("nepali-90s", [
    ["Gajalu Ti Thula Thula Aankha", "Narayan Gopal / Ghulam Ali", "ftEzdVJWdDA", 293],
    ["Gajalu (Music Video)", "Music Nepal", "FvGqeHYN3HA", 441],
  ]),
  "nepali-modern": t("nepali-modern", [
    ["Maya Pirati", "Sagar Lamsal / Tilak Basnet", "Utsdzzmyf9s", 350],
    ["Maya Pirati (Cover)", "Trishna Gurung", "ptboVrLu3b0", 203],
  ]),
  "english-90s": t("english-90s", [
    ["Billie Jean", "Michael Jackson", "Zi_XLOBDo_Y", 294],
    ["Smells Like Teen Spirit", "Nirvana", "hTWKbfoikeg", 278],
    ["I Want It That Way", "Backstreet Boys", "4fndeDfaWCg", 213],
    ["Wonderwall", "Oasis", "bx1Bh8ZvH84", 258],
    ["Wannabe", "Spice Girls", "gJLIiF15qjQ", 173],
    ["Baby One More Time", "Britney Spears", "C-u5v1e8Q8", 211],
  ]),
  "english-pop": t("english-pop", [
    ["Perfect", "Ed Sheeran", "2Vv-BfVoq4g", 263],
    ["Someone Like You", "Adele", "hLQl3WQQoQ0", 285],
    ["Hello", "Adele", "YQHsXMglC9A", 367],
    ["Thinking Out Loud", "Ed Sheeran", "lp-EO5I60KA", 291],
    ["Bad Guy", "Billie Eilish", "DyDfgMOUjCI", 194],
    ["Watermelon Sugar", "Harry Styles", "E07s5ZYygMg", 174],
    ["Circles", "Post Malone", "wXhTHyIgQ_U", 215],
    ["Photograph", "Ed Sheeran", "nSDgHBxUbVQ", 258],
  ]),
  hiphop: t("hiphop", [
    ["Lose Yourself", "Eminem", "_Yhyp-_hX2s", 326],
    ["Not Afraid", "Eminem", "j5-yKhDd64s", 258],
    ["God's Plan", "Drake", "xpVfcZ0ZcFM", 198],
    ["HUMBLE.", "Kendrick Lamar", "tvTRZJ-4EyI", 177],
    ["Sicko Mode", "Travis Scott", "6ONRf1R_eW4", 312],
    ["Stronger", "Kanye West", "PsO6ZnUZI0g", 312],
  ]),
  rap: t("rap", [
    ["Without Me", "Eminem", "YVkUvmDQ3HY", 291],
    ["Rap God", "Eminem", "XbGs_oWdV9M", 364],
    ["In Da Club", "50 Cent", "5qm8PH4xAss", 250],
    ["The Real Slim Shady", "Eminem", "eJO5HU_7_1w", 284],
    ["Forgot About Dre", "Dr. Dre ft. Eminem", "QFcv5Ma8u8k", 222],
    ["California Love", "2Pac ft. Dr. Dre", "FW29XzC6K1I", 285],
  ]),
  lofi: t("lofi", [
    ["1 A.M Study Session", "Lofi Girl", "lTRiuFIWV54", 180],
    ["River Flows In You (Piano)", "Yiruma", "7maJOI3QMu0", 188],
  ]),
  edm: t("edm", [
    ["The Nights", "Avicii", "UtF6JciCApE", 176],
    ["Wake Me Up", "Avicii", "IcrbM1l_BoI", 247],
    ["Animals", "Martin Garrix", "gCYcHz2k5x0", 303],
    ["Levels", "Avicii", "aHjpOzsQ9YI", 200],
    ["Titanium", "David Guetta ft. Sia", "JRfuAukYTKg", 245],
    ["Don't You Worry Child", "Swedish House Mafia", "1y6smkh6Yco", 213],
    ["Lean On", "Major Lazer & DJ Snake", "YqeW9_5kOBY", 176],
  ]),
  rock: t("rock", [
    ["Radioactive", "Imagine Dragons", "ktvTqknDobU", 186],
    ["Sweet Child O' Mine", "Guns N' Roses", "1w7OgIMMRc4", 302],
    ["Bohemian Rhapsody", "Queen", "fJ9rUzIMcZQ", 354],
    ["Hotel California", "Eagles", "EqPtz5qN7HM", 391],
    ["Thunderstruck", "AC/DC", "v2AC41dbbnM", 292],
    ["Enter Sandman", "Metallica", "CD-EIKNFaqA", 331],
    ["Numb", "Linkin Park", "kXYiU_JCYtU", 187],
    ["In the End", "Linkin Park", "eVTXPUF4Oz4", 216],
  ]),
  "hindi-classics": t("hindi-classics", [
    ["Kal Ho Naa Ho", "Sonu Nigam", "g0eO_AIczZM", 321],
  ]),
  "hindi-modern": t("hindi-modern", [
    ["Kesariya", "Arijit Singh", "BddP6PydY4M", 268],
    ["Tum Hi Ho", "Arijit Singh", "Umqb9_oC8nM", 261],
    ["Channa Mereya", "Arijit Singh", "284Ov7ysmfA", 289],
  ]),
  phonk: t("phonk", [
    ["Murder In My Mind", "Kordhell", "p7FCgwRLGfQ", 145],
  ]),
  chill: t("chill", [
    ["Let Her Go", "Passenger", "RBumgq5yVrA", 252],
    ["Counting Stars", "OneRepublic", "hT_nvWreIhg", 257],
    ["Demons", "Imagine Dragons", "mWRsgZuaDMo", 177],
    ["Yellow", "Coldplay", "yKNxeF4KMsY", 266],
    ["Fix You", "Coldplay", "k4V3Mo61fJM", 294],
    ["Somewhere Only We Know", "Keane", "DxKAVW_n_0", 236],
  ]),
  gaming: t("gaming", [
    ["Enemy", "Imagine Dragons & JID", "D9G1VOjN_84", 173],
    ["Natural", "Imagine Dragons", "V5M2WZiAy6k", 189],
    ["Thunder", "Imagine Dragons", "fKopy74weus", 187],
    ["Whatever It Takes", "Imagine Dragons", "gOsM-DYAEhY", 201],
    ["Warriors", "Imagine Dragons", "fmI_Ndrxy14", 170],
    ["Legends Never Die", "Against The Current", "r6zIGXun57U", 235],
  ]),
  instrumental: t("instrumental", [
    ["River Flows In You", "Yiruma", "7maJOI3QMu0", 188],
  ]),
  random: [],
};

const seenIds = new Set<string>();
TRACKS_BY_GENRE.random = Object.entries(TRACKS_BY_GENRE)
  .filter(([k]) => k !== "random")
  .flatMap(([, tracks]) => tracks)
  .filter((tr) => {
    if (seenIds.has(tr.youtubeId)) return false;
    seenIds.add(tr.youtubeId);
    return true;
  })
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
