/**
 * Legal free/royalty-free music catalog for NepARENA.
 * Sources: SoundHelix demos + Pixabay open audio streams.
 * Commercial chart hits are NOT included (no license).
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
  src: string;
  genre: MusicGenreId;
  cover?: string;
};

export type Genre = {
  id: MusicGenreId;
  label: string;
  emoji: string;
};

const SH = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

const PX = {
  a: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  b: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3",
  c: "https://cdn.pixabay.com/audio/2022/10/25/audio_946a2de4d6.mp3",
  d: "https://cdn.pixabay.com/audio/2021/11/25/audio_9175dae29a.mp3",
  e: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
  f: "https://cdn.pixabay.com/audio/2022/01/18/audio_d16737d2eb.mp3",
  g: "https://cdn.pixabay.com/audio/2022/05/16/audio_5c2c65e2c7.mp3",
  h: "https://cdn.pixabay.com/audio/2022/10/18/audio_31cc43fe5f.mp3",
};

const COVER = "/neparena-logo.png";

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

function pool(genre: MusicGenreId, items: [string, string, string][]): Track[] {
  return items.map(([title, artist, src], i) => ({
    id: `${genre}-${i}`,
    title,
    artist,
    src,
    genre,
    cover: COVER,
  }));
}

export const TRACKS_BY_GENRE: Record<MusicGenreId, Track[]> = {
  trending: pool("trending", [
    ["Pulse Rise", "NepARENA Radio", PX.c],
    ["Night Grid", "NepARENA Radio", PX.e],
    ["Skyline", "NepARENA Radio", SH(5)],
    ["Focus Fire", "NepARENA Radio", PX.a],
    ["Victory Lane", "NepARENA Radio", SH(8)],
  ]),
  "nepali-90s": pool("nepali-90s", [
    ["Valley Evening", "NepARENA Session", PX.f],
    ["Old Radio", "NepARENA Session", SH(1)],
    ["Monsoon Walk", "NepARENA Session", SH(2)],
    ["Tea Shop", "NepARENA Session", PX.g],
    ["Memory Lane", "NepARENA Session", PX.b],
  ]),
  "nepali-modern": pool("nepali-modern", [
    ["Kathmandu Pulse", "NepARENA Session", PX.e],
    ["Himal Drive", "NepARENA Session", PX.c],
    ["City Cipher", "NepARENA Session", SH(4)],
    ["Night Market", "NepARENA Session", PX.h],
    ["Open Mic", "NepARENA Session", SH(6)],
  ]),
  "english-90s": pool("english-90s", [
    ["Retro Highway", "NepARENA Session", SH(11)],
    ["Golden Hour", "NepARENA Session", SH(14)],
    ["Coastline", "NepARENA Session", PX.d],
    ["Weekend", "NepARENA Session", PX.c],
    ["Bright Side", "NepARENA Session", SH(13)],
  ]),
  "english-pop": pool("english-pop", [
    ["Open Road", "NepARENA Session", PX.a],
    ["Morning Coffee", "NepARENA Session", PX.g],
    ["After Hours", "NepARENA Session", SH(12)],
    ["Skyline Pop", "NepARENA Session", SH(3)],
    ["Soft Focus", "NepARENA Session", PX.b],
  ]),
  hiphop: pool("hiphop", [
    ["Street Flow", "NepARENA Session", PX.e],
    ["Bass Drop", "NepARENA Session", PX.h],
    ["Block Party", "NepARENA Session", SH(5)],
    ["Heavy Bars", "NepARENA Session", SH(7)],
    ["Night Ride", "NepARENA Session", PX.f],
  ]),
  rap: pool("rap", [
    ["Mic Check", "NepARENA Session", PX.h],
    ["Freestyle Loop", "NepARENA Session", SH(6)],
    ["Cipher", "NepARENA Session", PX.e],
    ["Overtime", "NepARENA Session", SH(8)],
    ["Warm-up", "NepARENA Session", SH(4)],
  ]),
  lofi: pool("lofi", [
    ["Lo-fi Study", "NepARENA Session", PX.a],
    ["Empty Mind", "NepARENA Session", PX.b],
    ["Desk Lamp", "NepARENA Session", PX.g],
    ["Rainy Desk", "NepARENA Session", SH(1)],
    ["Midnight Focus", "NepARENA Session", SH(2)],
  ]),
  edm: pool("edm", [
    ["Neon Grid", "NepARENA Session", PX.h],
    ["Circuit", "NepARENA Session", SH(12)],
    ["Laser", "NepARENA Session", SH(14)],
    ["Pulse", "NepARENA Session", PX.e],
    ["Orbit", "NepARENA Session", SH(9)],
  ]),
  rock: pool("rock", [
    ["Amp Room", "NepARENA Session", SH(7)],
    ["Power Chord", "NepARENA Session", SH(8)],
    ["Stage Lights", "NepARENA Session", PX.c],
    ["Encore", "NepARENA Session", SH(10)],
    ["Crowd Wave", "NepARENA Session", SH(9)],
  ]),
  "hindi-classics": pool("hindi-classics", [
    ["Soft Breeze", "NepARENA Session", PX.g],
    ["Rain Window", "NepARENA Session", PX.b],
    ["Evening Mood", "NepARENA Session", PX.d],
    ["Quiet Heart", "NepARENA Session", SH(15)],
    ["Monsoon Patio", "NepARENA Session", SH(16)],
  ]),
  "hindi-modern": pool("hindi-modern", [
    ["City Lights", "NepARENA Session", SH(15)],
    ["Train Window", "NepARENA Session", SH(3)],
    ["Night Market", "NepARENA Session", PX.a],
    ["Soft Keys", "NepARENA Session", PX.g],
    ["Float", "NepARENA Session", SH(11)],
  ]),
  phonk: pool("phonk", [
    ["Drift", "NepARENA Session", PX.f],
    ["Cowbell Night", "NepARENA Session", PX.e],
    ["Phonk Loop", "NepARENA Session", SH(5)],
    ["Bass Crawl", "NepARENA Session", PX.h],
    ["Dark Ride", "NepARENA Session", SH(6)],
  ]),
  chill: pool("chill", [
    ["Breeze", "NepARENA Session", PX.g],
    ["Cloud Nine", "NepARENA Session", PX.b],
    ["Slow Afternoon", "NepARENA Session", SH(9)],
    ["Quiet Park", "NepARENA Session", PX.a],
    ["Easy Sunday", "NepARENA Session", PX.d],
  ]),
  gaming: pool("gaming", [
    ["Match Ready", "NepARENA Session", PX.e],
    ["Final Round", "NepARENA Session", SH(5)],
    ["Clutch", "NepARENA Session", PX.h],
    ["Lobby", "NepARENA Session", SH(8)],
    ["Grand Final", "NepARENA Session", PX.c],
  ]),
  instrumental: pool("instrumental", [
    ["Atmosphere", "NepARENA Session", PX.d],
    ["Horizon", "NepARENA Session", SH(15)],
    ["Depth", "NepARENA Session", SH(16)],
    ["Story", "NepARENA Session", PX.b],
    ["Opening Title", "NepARENA Session", PX.g],
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
