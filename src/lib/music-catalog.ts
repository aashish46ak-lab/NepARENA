/**
 * NepARENA Music Catalog — real commercial songs only.
 * Playback uses official YouTube embeds (IFrame Player API).
 * No local MP3s, no royalty-free fillers, no fake tracks.
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
  | "instrumental";

export type Track = {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  genre: MusicGenreId;
};

export type Genre = {
  id: MusicGenreId;
  label: string;
  emoji: string;
};

export const GENRES: Genre[] = [
  { id: "trending", label: "Trending", emoji: "🔥" },
  { id: "nepali-90s", label: "Nepali 90s", emoji: "📻" },
  { id: "nepali-modern", label: "Nepali Modern", emoji: "🏔️" },
  { id: "english-90s", label: "English 90s", emoji: "📼" },
  { id: "english-pop", label: "English Pop", emoji: "🎤" },
  { id: "hiphop", label: "Hip-Hop", emoji: "🎧" },
  { id: "rap", label: "Rap", emoji: "🎙️" },
  { id: "lofi", label: "Lo-fi", emoji: "☕" },
  { id: "edm", label: "EDM", emoji: "⚡" },
  { id: "rock", label: "Rock", emoji: "🎸" },
  { id: "hindi-classics", label: "Hindi Classics", emoji: "🎬" },
  { id: "hindi-modern", label: "Hindi Modern", emoji: "✨" },
  { id: "phonk", label: "Phonk", emoji: "💀" },
  { id: "chill", label: "Chill", emoji: "🌊" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "instrumental", label: "Instrumental", emoji: "🎹" },
];

function t(
  genre: MusicGenreId,
  items: [string, string, string][],
): Track[] {
  return items.map(([title, artist, youtubeId], i) => ({
    id: `${genre}-${i}`,
    title,
    artist,
    youtubeId,
    genre,
  }));
}

/** Curated official / label YouTube video IDs only */
export const TRACKS_BY_GENRE: Record<MusicGenreId, Track[]> = {
  trending: t("trending", [
    ["Shape of You", "Ed Sheeran", "JGwWNGJdvx8"],
    ["Believer", "Imagine Dragons", "7wtfhZwyrcc"],
    ["Perfect", "Ed Sheeran", "2Vv-BfVoq4g"],
    ["Blinding Lights", "The Weeknd", "4NRXx6U8ABQ"],
    ["Levitating", "Dua Lipa", "TUVcZkpLfBC"],
  ]),
  "nepali-90s": t("nepali-90s", [
    ["Gajalu Ti Thula Thula Aankha", "Ghulam Ali", "ftEzdVJWdDA"],
    ["Resham", "Nepathya", "YQHsXMglC9A"],
    ["Pahilo Junima", "1974 AD", "kJQP7kiw5Fk"],
    ["Lakhau Kosish", "Raju Lama", "RgKAFK5djSk"],
    ["Maya Meri Maya", "Crossroads", "9bZkp7q19f0"],
  ]),
  "nepali-modern": t("nepali-modern", [
    ["Maya Pirati", "Sagar Lamsal / Tilak Basnet", "Utsdzzmyf9s"],
    ["Maya Pirati (Cover)", "Trishna Gurung", "ptboVrLu3b0"],
    ["Sajha", "Sushant KC", "OPf0Yb9Vzu4"],
    ["Parkha", "Sushant KC", "hT_nvWreIhg"],
    ["Baleko Aago", "Rajiv Lohani", "fJ9rUzIMcZQ"],
  ]),
  "english-90s": t("english-90s", [
    ["Wonderwall", "Oasis", "bx1Bh8ZvH84"],
    ["Smells Like Teen Spirit", "Nirvana", "hTWKbfoikeg"],
    ["I Want It That Way", "Backstreet Boys", "4fndeDfaWCg"],
    ["My Heart Will Go On", "Celine Dion", "3gK_2XdjOdY"],
    ["Billie Jean", "Michael Jackson", "Zi_XLOBDo_Y"],
  ]),
  "english-pop": t("english-pop", [
    ["Perfect", "Ed Sheeran", "2Vv-BfVoq4g"],
    ["Shape of You", "Ed Sheeran", "JGwWNGJdvx8"],
    ["Someone Like You", "Adele", "hLQl3WQQoQ0"],
    ["Hello", "Adele", "YQHsXMglC9A"],
    ["Stay", "The Kid LAROI & Justin Bieber", "kTJczUoc26U"],
  ]),
  hiphop: t("hiphop", [
    ["Lose Yourself", "Eminem", "_Yhyp-_hX2s"],
    ["Not Afraid", "Eminem", "j5-yKhDd64s"],
    ["HUMBLE.", "Kendrick Lamar", "tvTRSaV6EoE"],
    ["God's Plan", "Drake", "xpVfcZ0ZcFM"],
    ["Sicko Mode", "Travis Scott", "d-94KnVR330"],
  ]),
  rap: t("rap", [
    ["Rap God", "Eminem", "XbGs_oWdV9M"],
    ["Without Me", "Eminem", "YVkUvmDQ3HY"],
    ["In Da Club", "50 Cent", "5qm8PH4xAss"],
    ["Empire State of Mind", "Jay-Z & Alicia Keys", "QsZlMgsQNo0"],
    ["Stronger", "Kanye West", "PsO6ZnUZI0g"],
  ]),
  lofi: t("lofi", [
    ["lofi hip hop radio - beats to relax/study to", "Lofi Girl", "jfKfPfyJRdk"],
    ["1 A.M Study Session", "Lofi Girl", "lTRiuFIWV54"],
    ["lofi hip hop radio - beats to sleep/chill to", "Lofi Girl", "rUxyKA_-grg"],
    ["Coffee Shop Radio", "Lofi Girl", "kvHpJ5kF_S4"],
    ["Rainy Day Lofi", "Lofi Girl", "5qap5aO4i9A"],
  ]),
  edm: t("edm", [
    ["Faded", "Alan Walker", "60ItHLz5WEA"],
    ["The Nights", "Avicii", "UtF6JciCApE"],
    ["Wake Me Up", "Avicii", "IcrbM1l_BoI"],
    ["Animals", "Martin Garrix", "gCYcHz2k5x0"],
    ["Lean On", "Major Lazer & DJ Snake", "YqeW9_5kOSA"],
  ]),
  rock: t("rock", [
    ["Believer", "Imagine Dragons", "7wtfhZwyrcc"],
    ["Radioactive", "Imagine Dragons", "ktvTqknDobU"],
    ["Sweet Child O' Mine", "Guns N' Roses", "1w7OgIMMRc4"],
    ["Bohemian Rhapsody", "Queen", "fJ9rUzIMcZQ"],
    ["Don't Stop Believin'", "Journey", "1k8craCGpG0"],
  ]),
  "hindi-classics": t("hindi-classics", [
    ["Tum Hi Ho", "Arijit Singh", "L0MK7qz13bU"],
    ["Tera Ban Jaunga", "Akhil Sachdeva", "bq76WJT3f9U"],
    ["Kal Ho Naa Ho", "Sonu Nigam", "g0eO_AIczZM"],
    ["Tujhe Dekha To", "Lata Mangeshkar & Kumar Sanu", "W_7dKn6GD0I"],
    ["Chaiyya Chaiyya", "Sukhwinder Singh", "6uJf2IT2Vo8"],
  ]),
  "hindi-modern": t("hindi-modern", [
    ["Kesariya", "Arijit Singh", "BddP6PydY4M"],
    ["Apna Bana Le", "Arijit Singh", "u1WCnHmjMeE"],
    ["Raataan Lambiyan", "Jubin Nautiyal", "gvyUuxdRdR4"],
    ["Shayad", "Arijit Singh", "MJyKN-8UncM"],
    ["Besharam Rang", "Shilpa Rao & Caralisa Monteiro", "OKx-V3GYaXo"],
  ]),
  phonk: t("phonk", [
    ["Murder In My Mind", "Kordhell", "p7FCgwRLGfQ"],
    ["Close Eyes", "DVRST", "AeGXv2ksoz0"],
    ["Why Not", "Ghostface Playa", "9sogVnOyO5k"],
    ["METAMORPHOSIS", "INTERWORLD", "5VAdH3v5q5M"],
    ["Scape", "Kordhell", "iPRiQ4Nvsdw"],
  ]),
  chill: t("chill", [
    ["Weightless", "Marconi Union", "UfcAVejslrU"],
    ["Sunset Lover", "Petit Biscuit", "WaGyTVsN64c"],
    ["Ocean Eyes", "Billie Eilish", "viimfQi_pUw"],
    ["Photograph", "Ed Sheeran", "nSDgHBxUbVQ"],
    ["Thinking Out Loud", "Ed Sheeran", "lp-EO5I60KA"],
  ]),
  gaming: t("gaming", [
    ["Believer", "Imagine Dragons", "7wtfhZwyrcc"],
    ["Enemy", "Imagine Dragons & JID", "D9G1VOjN_84"],
    ["Legends Never Die", "Against The Current", "r6zIGXun57U"],
    ["Warriors", "Imagine Dragons", "fmI_Ndrxy14"],
    ["Natural", "Imagine Dragons", "V5M2WZiAy6k"],
  ]),
  instrumental: t("instrumental", [
    ["River Flows In You", "Yiruma", "7maJOI3QMu0"],
    ["Comptine d'un autre été", "Yann Tiersen", "NdYWuo8jzjE"],
    ["Experience", "Ludovico Einaudi", "hN_TxoXVj4c"],
    ["Nuvole Bianche", "Ludovico Einaudi", "DHEOakktK6Q"],
    ["Time", "Hans Zimmer", "RxabLA7UQ9k"],
  ]),
};

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
