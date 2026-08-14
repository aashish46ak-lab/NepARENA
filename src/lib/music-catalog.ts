/**
 * Global music catalog for NepARENA.
 *
 * Only free / Creative Commons / public-domain / demo tracks are included.
 * Commercial Nepali, Hindi, or English chart hits cannot be redistributed
 * without licenses — put licensed files in /public/music/ and point src there.
 */

export type MusicCategoryId =
  | "nepali-90s"
  | "nepali-hiphop"
  | "nepali-band"
  | "english"
  | "hindi"
  | "lofi"
  | "esports"
  | "chill"
  | "electronic"
  | "cinematic";

export type Track = {
  id: string;
  title: string;
  artist: string;
  src: string;
  license: string;
};

export type MusicCategory = {
  id: MusicCategoryId;
  label: string;
  description: string;
  tracks: Track[];
};

/** SoundHelix free demo instrumentals (freely usable demos). */
const SH = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

/**
 * Free / CC beds. Prefer stable hosts.
 * Pixabay Content License tracks (royalty-free for platform use).
 */
const PX = {
  lofi1: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  lofi2: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3",
  inspire: "https://cdn.pixabay.com/audio/2022/10/25/audio_946a2de4d6.mp3",
  cinema: "https://cdn.pixabay.com/audio/2021/11/25/audio_9175dae29a.mp3",
  funk: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
  trap: "https://cdn.pixabay.com/audio/2022/01/18/audio_d16737d2eb.mp3",
  calm: "https://cdn.pixabay.com/audio/2022/05/16/audio_5c2c65e2c7.mp3",
  beat: "https://cdn.pixabay.com/audio/2022/10/18/audio_31cc43fe5f.mp3",
  soft: "https://cdn.pixabay.com/audio/2021/08/09/audio_c8c8a73467.mp3",
  night: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3",
  drive: "https://cdn.pixabay.com/audio/2022/08/03/audio_54caaf4c84.mp3",
  pulse: "https://cdn.pixabay.com/audio/2022/01/20/audio_f6496c6f5e.mp3",
  dream: "https://cdn.pixabay.com/audio/2022/03/24/audio_c8c0f5f3f0.mp3",
  energy: "https://cdn.pixabay.com/audio/2022/09/02/audio_7a4c0f4d5e.mp3",
};

const L = "Free demo / CC — swap with licensed masters when available";

function t(
  id: string,
  title: string,
  artist: string,
  src: string,
  license = L,
): Track {
  return { id, title, artist, src, license };
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    id: "nepali-90s",
    label: "90s Nepali",
    description: "Classic Nepali mood (free demos — add licensed 90s tracks)",
    tracks: [
      t("n90-1", "Valley Evening", "NepARENA Session", PX.trap),
      t("n90-2", "Kathmandu Night", "NepARENA Session", PX.lofi2),
      t("n90-3", "Hill Road", "NepARENA Session", PX.calm),
      t("n90-4", "Old Radio", "NepARENA Session", SH(1)),
      t("n90-5", "Monsoon Walk", "NepARENA Session", SH(2)),
      t("n90-6", "Tea Shop Blues", "NepARENA Session", PX.soft),
      t("n90-7", "Sunset Durbar", "NepARENA Session", SH(3)),
      t("n90-8", "Memory Lane", "NepARENA Session", PX.dream),
    ],
  },
  {
    id: "nepali-hiphop",
    label: "Nepali Hip-Hop",
    description: "Rap / trap energy demos",
    tracks: [
      t("nhh-1", "Street Flow", "NepARENA Session", PX.funk),
      t("nhh-2", "Bass Drop", "NepARENA Session", PX.beat),
      t("nhh-3", "Mic Check", "NepARENA Session", PX.pulse),
      t("nhh-4", "City Cipher", "NepARENA Session", SH(4)),
      t("nhh-5", "Block Party", "NepARENA Session", SH(5)),
      t("nhh-6", "Night Ride", "NepARENA Session", PX.trap),
      t("nhh-7", "Heavy Bars", "NepARENA Session", PX.energy),
      t("nhh-8", "Freestyle Loop", "NepARENA Session", SH(6)),
    ],
  },
  {
    id: "nepali-band",
    label: "Nepali Band",
    description: "Band / rock-style demos",
    tracks: [
      t("nb-1", "Himalaya Drive", "NepARENA Session", PX.inspire),
      t("nb-2", "Amp Room", "NepARENA Session", SH(7)),
      t("nb-3", "Stage Lights", "NepARENA Session", PX.drive),
      t("nb-4", "Power Chord", "NepARENA Session", SH(8)),
      t("nb-5", "Encore", "NepARENA Session", SH(9)),
      t("nb-6", "Open Mic", "NepARENA Session", PX.funk),
      t("nb-7", "Crowd Wave", "NepARENA Session", SH(10)),
      t("nb-8", "Last Song", "NepARENA Session", PX.cinema),
    ],
  },
  {
    id: "english",
    label: "English",
    description: "English-mood free instrumentals",
    tracks: [
      t("en-1", "Open Road", "NepARENA Session", PX.lofi1),
      t("en-2", "Focus Mode", "NepARENA Session", PX.cinema),
      t("en-3", "Morning Coffee", "NepARENA Session", PX.calm),
      t("en-4", "Highway", "NepARENA Session", SH(11)),
      t("en-5", "Skyline", "NepARENA Session", SH(12)),
      t("en-6", "Weekend", "NepARENA Session", PX.inspire),
      t("en-7", "After Hours", "NepARENA Session", PX.night),
      t("en-8", "Bright Side", "NepARENA Session", SH(13)),
      t("en-9", "Coastline", "NepARENA Session", PX.dream),
      t("en-10", "Golden Hour", "NepARENA Session", SH(14)),
    ],
  },
  {
    id: "hindi",
    label: "Hindi",
    description: "Hindi-mood free demos (replace with licensed film/indie tracks)",
    tracks: [
      t("hi-1", "Soft Breeze", "NepARENA Session", PX.soft),
      t("hi-2", "Rain Window", "NepARENA Session", PX.calm),
      t("hi-3", "Evening Raga Mood", "NepARENA Session", PX.cinema),
      t("hi-4", "City Lights", "NepARENA Session", SH(15)),
      t("hi-5", "Quiet Heart", "NepARENA Session", PX.lofi2),
      t("hi-6", "Train Window", "NepARENA Session", SH(16)),
      t("hi-7", "Monsoon Patio", "NepARENA Session", PX.dream),
      t("hi-8", "Night Market", "NepARENA Session", PX.night),
    ],
  },
  {
    id: "lofi",
    label: "Lo-fi",
    description: "Study / chill beats",
    tracks: [
      t("lo-1", "Lo-fi Study", "Free Session", PX.lofi1),
      t("lo-2", "Empty Mind", "Free Session", PX.lofi2),
      t("lo-3", "Desk Lamp", "Free Session", PX.calm),
      t("lo-4", "Rainy Desk", "Free Session", PX.soft),
      t("lo-5", "Notebook", "Free Session", SH(1)),
      t("lo-6", "Late Library", "Free Session", SH(2)),
      t("lo-7", "Soft Keys", "Free Session", PX.dream),
      t("lo-8", "Coffee Loop", "Free Session", SH(3)),
      t("lo-9", "Window Seat", "Free Session", PX.night),
      t("lo-10", "Midnight Focus", "Free Session", SH(4)),
    ],
  },
  {
    id: "esports",
    label: "Esports Energy",
    description: "Match-day hype",
    tracks: [
      t("es-1", "Match Ready", "Free Session", PX.funk),
      t("es-2", "Inspire", "Free Session", PX.inspire),
      t("es-3", "Final Round", "Free Session", PX.pulse),
      t("es-4", "Clutch", "Free Session", SH(5)),
      t("es-5", "Victory Screen", "Free Session", PX.beat),
      t("es-6", "Warm-up", "Free Session", SH(6)),
      t("es-7", "Tournament Lobby", "Free Session", PX.energy),
      t("es-8", "Overtime", "Free Session", SH(7)),
      t("es-9", "MVP", "Free Session", PX.drive),
      t("es-10", "Grand Final", "Free Session", SH(8)),
    ],
  },
  {
    id: "chill",
    label: "Chill",
    description: "Relaxed vibes",
    tracks: [
      t("ch-1", "Breeze", "Free Session", PX.calm),
      t("ch-2", "Soft Waves", "Free Session", PX.soft),
      t("ch-3", "Cloud Nine", "Free Session", PX.dream),
      t("ch-4", "Slow Afternoon", "Free Session", SH(9)),
      t("ch-5", "Quiet Park", "Free Session", PX.lofi1),
      t("ch-6", "Warm Light", "Free Session", SH(10)),
      t("ch-7", "Easy Sunday", "Free Session", PX.cinema),
      t("ch-8", "Float", "Free Session", SH(11)),
    ],
  },
  {
    id: "electronic",
    label: "Electronic",
    description: "Synths & beats",
    tracks: [
      t("el-1", "Pulse", "Free Session", PX.pulse),
      t("el-2", "Neon Grid", "Free Session", PX.beat),
      t("el-3", "Circuit", "Free Session", SH(12)),
      t("el-4", "Synthwave", "Free Session", PX.drive),
      t("el-5", "Bassline", "Free Session", SH(13)),
      t("el-6", "Arcade", "Free Session", PX.funk),
      t("el-7", "Laser", "Free Session", SH(14)),
      t("el-8", "Orbit", "Free Session", PX.energy),
    ],
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Score-style atmospheres",
    tracks: [
      t("ci-1", "Atmosphere", "Free Session", PX.cinema),
      t("ci-2", "Horizon", "Free Session", SH(15)),
      t("ci-3", "Rise", "Free Session", PX.inspire),
      t("ci-4", "Depth", "Free Session", SH(16)),
      t("ci-5", "Story", "Free Session", PX.dream),
      t("ci-6", "Epilogue", "Free Session", PX.night),
      t("ci-7", "Credits", "Free Session", SH(1)),
      t("ci-8", "Opening Title", "Free Session", PX.calm),
    ],
  },
];

export function getCategory(id: MusicCategoryId): MusicCategory | undefined {
  return MUSIC_CATEGORIES.find((c) => c.id === id);
}

export function allTracks(): Track[] {
  return MUSIC_CATEGORIES.flatMap((c) => c.tracks);
}
