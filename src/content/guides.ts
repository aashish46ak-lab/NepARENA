/** Evergreen guides — edit freely. */
export type Guide = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  sections: { heading: string; body: string }[];
};

export const GUIDE_CATEGORIES = [
  "Getting Started",
  "Tournament Guide",
  "Player Guide",
  "Match & Fixture Guide",
  "Reporting Guide",
  "eFootball Guides",
  "Fair Play Guide",
  "Organizer Guide",
] as const;

export const GUIDES: Guide[] = [
  {
    slug: "create-account-and-profile",
    category: "Getting Started",
    title: "Create an account and complete your profile",
    excerpt: "Sign up, set your display name, and get ready to join tournaments.",
    sections: [
      {
        heading: "Create your account",
        body: "Open NepARENA and choose sign-up. Use a real email you can access for verification and recovery. After login, you land on the platform home feed.",
      },
      {
        heading: "Complete your profile",
        body: "Add a clear display name and avatar. If you compete in eFootball or other titles, keep your in-game name consistent with what organizers expect on registration forms.",
      },
      {
        heading: "Explore before you join",
        body: "Browse organizers and tournaments first. Read event rules and schedules so you only join cups you can finish.",
      },
    ],
  },
  {
    slug: "discover-and-join-tournaments",
    category: "Tournament Guide",
    title: "Discover, join, and follow tournaments",
    excerpt: "Find events, register, and track fixtures without relying only on chat groups.",
    sections: [
      {
        heading: "Find tournaments",
        body: "Use the tournaments list and organizer pages to see registration status, format, and start dates. Open the public tournament page for fixtures, standings, and brackets when published.",
      },
      {
        heading: "Join correctly",
        body: "Register only while registration is open. Fill required fields accurately. Wait for approval if the organizer reviews entries manually.",
      },
      {
        heading: "Follow the event",
        body: "Check matchdays, publish status, and deadlines on the tournament page. Turn on notifications when available so you do not miss result windows.",
      },
    ],
  },
  {
    slug: "profiles-results-and-stats",
    category: "Player Guide",
    title: "Profiles, results, and competitive identity",
    excerpt: "How your profile connects to matches and community presence.",
    sections: [
      {
        heading: "Your public profile",
        body: "Other players may see your name, avatar, and public activity. Keep it respectful and recognizable to organizers.",
      },
      {
        heading: "Results matter",
        body: "Played matches and approved results form the competitive record organizers rely on. Always submit honest scores.",
      },
      {
        heading: "Stay consistent",
        body: "Using multiple identities to gain unfair advantage can break event rules and platform fair-play rules.",
      },
    ],
  },
  {
    slug: "fixtures-deadlines-and-results",
    category: "Match & Fixture Guide",
    title: "Fixtures, deadlines, and result submission",
    excerpt: "How matchdays work and how to submit scores with evidence.",
    sections: [
      {
        heading: "Reading fixtures",
        body: "Fixtures are grouped by matchday. Unpublished matchdays may appear locked to the public until the organizer publishes them.",
      },
      {
        heading: "Play in the window",
        body: "Agree a time inside the allowed window. If you need a change, message your opponent and the organizer early.",
      },
      {
        heading: "Submit results",
        body: "After the match, submit the score in the app when prompted. Keep a clear end-screen screenshot until the matchday is finalized.",
      },
    ],
  },
  {
    slug: "how-to-report-issues",
    category: "Reporting Guide",
    title: "How to report inactivity, disputes, and rule breaks",
    excerpt: "What to include so organizers can review fairly.",
    sections: [
      {
        heading: "When to report",
        body: "Report no-shows after the official wait time, score conflicts, toxic behavior, or suspected cheating—with evidence.",
      },
      {
        heading: "What to attach",
        body: "Include match context, timestamps, screenshots/video if available, and a short factual summary. Avoid personal attacks in the report text.",
      },
      {
        heading: "After you report",
        body: "Wait for organizer or staff review. Do not spam multiple channels with the same case unless asked for more info.",
      },
    ],
  },
  {
    slug: "efootball-tournament-prep",
    category: "eFootball Guides",
    title: "eFootball tournament preparation basics",
    excerpt: "Practical prep so match day is smoother.",
    sections: [
      {
        heading: "Settings first",
        body: "Confirm match length, difficulty/conditions, and any restricted features from the event rules before kick-off.",
      },
      {
        heading: "Connection",
        body: "Use a stable network. Pause other heavy downloads. If disconnect rules exist, know the remake policy before you start.",
      },
      {
        heading: "Evidence habit",
        body: "Capture the final scoreboard every match. It saves time if a result is contested later.",
      },
    ],
  },
  {
    slug: "fair-play-on-neparena",
    category: "Fair Play Guide",
    title: "Fair play on NepARENA",
    excerpt: "Cheating, exploits, disconnects, and sportsmanship expectations.",
    sections: [
      {
        heading: "No cheats or collusion",
        body: "Hacks, unfair tools, match-fixing, and eligibility abuse are banned. Penalties can include defaults or removal.",
      },
      {
        heading: "Disconnects",
        body: "Follow event policy. Repeated suspicious disconnects can be treated as misconduct.",
      },
      {
        heading: "Respect",
        body: "Compete hard, but keep chat and reports professional. Harassment has no place on the platform.",
      },
    ],
  },
  {
    slug: "organizer-tournament-ops",
    category: "Organizer Guide",
    title: "Organizer basics: tournaments, fixtures, and results",
    excerpt: "A practical checklist for running a clean event on NepARENA.",
    sections: [
      {
        heading: "Before registration",
        body: "Write clear format, schedule, rules, and eligibility. Publish them on the tournament page.",
      },
      {
        heading: "During the event",
        body: "Generate fixtures, publish matchdays when ready, and monitor result submissions. Seed knockout only when the group stage is ready.",
      },
      {
        heading: "Disputes",
        body: "Review evidence consistently. Record defaults with reasons. Communicate decisions briefly to involved players.",
      },
    ],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
