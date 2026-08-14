/**
 * Music catalog for the global player.
 * Only free / Creative Commons / public-domain demo tracks are bundled.
 * Replace `src` URLs with your properly licensed files when you have rights.
 * Commercial Nepali/Hindi/English hits cannot be shipped without licenses.
 */

export type MusicCategoryId =
  | "nepali-90s"
  | "nepali-hiphop"
  | "nepali-band"
  | "english"
  | "hindi"
  | "lofi"
  | "esports";

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

/** Free demo beds (CC0 / open samples). Swap for licensed tracks later. */
const DEMO = {
  ambient1:
    "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
  ambient2:
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=empty-mind-118973.mp3",
  upbeat1:
    "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946a2de4d6.mp3?filename=inspire-138502.mp3",
  chill1:
    "https://cdn.pixabay.com/download/audio/2021/11/25/audio_9175dae29a.mp3?filename=cinematic-atmosphere-score-2-22136.mp3",
  energy1:
    "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=funker-ama-124008.mp3",
  soft1:
    "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d16737d2eb.mp3?filename=slow-trap-18565.mp3",
};

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    id: "nepali-90s",
    label: "90s Nepali",
    description: "Classic Nepali vibes (add licensed tracks)",
    tracks: [
      {
        id: "n90-1",
        title: "Valley Evening (Demo)",
        artist: "NepARENA Demo",
        src: DEMO.soft1,
        license: "Pixabay Content License — replace with licensed 90s Nepali",
      },
      {
        id: "n90-2",
        title: "Kathmandu Night (Demo)",
        artist: "NepARENA Demo",
        src: DEMO.ambient2,
        license: "Pixabay Content License — replace with licensed 90s Nepali",
      },
    ],
  },
  {
    id: "nepali-hiphop",
    label: "Nepali Hip-Hop",
    description: "Nepali rap / hip-hop energy",
    tracks: [
      {
        id: "nhh-1",
        title: "Street Flow (Demo)",
        artist: "NepARENA Demo",
        src: DEMO.energy1,
        license: "Pixabay Content License — replace with licensed Nepali hip-hop",
      },
    ],
  },
  {
    id: "nepali-band",
    label: "Nepali Band",
    description: "Band & rock style",
    tracks: [
      {
        id: "nb-1",
        title: "Himalaya Drive (Demo)",
        artist: "NepARENA Demo",
        src: DEMO.upbeat1,
        license: "Pixabay Content License — replace with licensed band tracks",
      },
    ],
  },
  {
    id: "english",
    label: "English",
    description: "English pop / chill",
    tracks: [
      {
        id: "en-1",
        title: "Open Road (Demo)",
        artist: "NepARENA Demo",
        src: DEMO.ambient1,
        license: "Pixabay Content License",
      },
      {
        id: "en-2",
        title: "Focus Mode (Demo)",
        artist: "NepARENA Demo",
        src: DEMO.chill1,
        license: "Pixabay Content License",
      },
    ],
  },
  {
    id: "hindi",
    label: "Hindi",
    description: "Hindi mood (licensed tracks only)",
    tracks: [
      {
        id: "hi-1",
        title: "Soft Breeze (Demo)",
        artist: "NepARENA Demo",
        src: DEMO.soft1,
        license: "Pixabay Content License — replace with licensed Hindi",
      },
    ],
  },
  {
    id: "lofi",
    label: "Lo-fi",
    description: "Study / chill beats",
    tracks: [
      {
        id: "lo-1",
        title: "Lo-fi Study",
        artist: "Pixabay",
        src: DEMO.ambient1,
        license: "Pixabay Content License",
      },
      {
        id: "lo-2",
        title: "Empty Mind",
        artist: "Pixabay",
        src: DEMO.ambient2,
        license: "Pixabay Content License",
      },
    ],
  },
  {
    id: "esports",
    label: "Esports Energy",
    description: "Match-day hype",
    tracks: [
      {
        id: "es-1",
        title: "Match Ready",
        artist: "Pixabay",
        src: DEMO.energy1,
        license: "Pixabay Content License",
      },
      {
        id: "es-2",
        title: "Inspire",
        artist: "Pixabay",
        src: DEMO.upbeat1,
        license: "Pixabay Content License",
      },
    ],
  },
];

export function getCategory(id: MusicCategoryId): MusicCategory | undefined {
  return MUSIC_CATEGORIES.find((c) => c.id === id);
}
