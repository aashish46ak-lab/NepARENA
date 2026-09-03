type NewsArticle = {
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

export const ARTICLE_4: NewsArticle = {
  id: "seed-efootball-nepal",
  slug: "efootball-nepal-on-neparena",
  title: "eFootball Nepal on NepARENA — what players should know",
  excerpt: "How the first organizer community uses the platform for cups, results, and discovery.",
  body: `eFootball Nepal is the first organizer community on NepARENA for players in and around the Nepal eFootball scene.\n\n## What you will find\nPublic tournament pages, fixtures and standings when published, an organizer profile to follow, and event rules alongside platform rules.\n\n## How to stay ready\nComplete your profile, follow the organizer page, join early when registration opens, and check the tournament page before asking in chat.\n\n## Newer players\nYou do not need to be a pro. Showing up on time, finishing matches, and respecting opponents matters most.\n\nMore organizers will join over time. eFootball Nepal remains a core community — not the only one.`,
  category: "Community",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-03-01T10:00:00.000Z",
  featured: true,
  status: "published",
};
