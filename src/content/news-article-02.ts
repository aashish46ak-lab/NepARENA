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

export const ARTICLE_2: NewsArticle = {
  id: "seed-org-why",
  slug: "why-organizers-move-cups-off-group-chats",
  title: "Why organizers are moving cups off group chats",
  excerpt: "Registration chaos, missing screenshots, and disputes — and how a public tournament page helps hosts.",
  body: `Chat apps are great for coordination but weak as a system of record.\n\n## Common pain\nPlayers join late with incomplete names. Fixtures hide in messages half the group never sees. Score disputes become screenshot wars. New players cannot find the next event.\n\n## What a tournament page gives you\nOne registration flow, published rules, matchdays, standings, and brackets on a stable URL you can share anywhere. Your community can still talk on WhatsApp or Discord — the official schedule lives on NepARENA.\n\n## Multi-organizer design\neFootball Nepal was the first home. Other organizers can run their own events with their own branding. Players discover cups across the platform instead of hunting for the right group.`,
  category: "Organizers",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-02-10T11:00:00.000Z",
  featured: false,
  status: "published",
};
