/** Seed / fallback news when platform_news table is empty. */
export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  cover_url: string | null;
  published_at: string;
  featured: boolean;
  status: "published" | "draft";
};

export const NEWS_SEED: NewsArticle[] = [
  {
    id: "seed-welcome",
    slug: "welcome-to-neparena",
    title: "Welcome to NepARENA",
    excerpt:
      "A short note on what NepARENA is building for players and organizers in Nepal.",
    body: `NepARENA is a multi-organizer esports platform made for competitive communities in Nepal.\n\nHere you can discover tournaments, follow fixtures and standings, manage results more cleanly, and keep rules and guides in one place.\n\nThis News space is where official updates will appear. Organizers and players should still check each tournament page for event-specific announcements.\n\nThank you for being part of the arena — play fair and respect everyone.`,
    category: "Announcement",
    author: "NepARENA",
    cover_url: null,
    published_at: "2026-01-15T10:00:00.000Z",
    featured: true,
    status: "published",
  },
];
