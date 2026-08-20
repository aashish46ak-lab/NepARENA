/** Seed / fallback news when platform_news table is empty. Admin can add real rows in Supabase. */
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
      "A multi-organizer esports hub for players and organizers worldwide — tournaments, fixtures, and fair play in one place.",
    body: `NepARENA is a multi-organizer esports platform built for competitive communities everywhere.

Discover tournaments, follow fixtures and standings, manage results more cleanly, and keep rules and guides in one place — whether you compete locally or internationally.

This News space is where official updates will appear. Organizers and players should still check each tournament page for event-specific announcements.

Thank you for being part of the arena. Play fair. Respect everyone.`,
    category: "Announcement",
    author: "NepARENA",
    cover_url: null,
    published_at: "2026-01-15T10:00:00.000Z",
    featured: true,
    status: "published",
  },
];
