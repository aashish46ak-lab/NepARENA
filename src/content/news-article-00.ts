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

export const ARTICLE_0: NewsArticle = {
  id: "seed-welcome",
  slug: "welcome-to-neparena",
  title: "Welcome to NepARENA — a home for organized esports",
  excerpt:
    "Why we built a multi-organizer platform for tournaments, fixtures, and fair play — and how players and hosts can use it from day one.",
  body: `NepARENA is a multi-organizer esports platform built for competitive communities — starting in Nepal and open to organizers worldwide.\n\nFor years, most online cups lived inside chat groups: registration lists in messages, fixtures in screenshots, and disputes with no clear trail. That works for a weekend among friends. It falls apart when you want reliable schedules, public standings, and a fair path for new players to join.\n\n## What you can do on NepARENA\n\n- **Players** browse live and upcoming tournaments, request to join, track matchdays, submit results when required, and keep a profile tied to real competitive activity.\n- **Organizers** create events, manage participants, publish fixtures and standings, and present a public page for their community — without rebuilding tools for every cup.\n- **Fans** follow organizers and results without needing access to private chats.\n\n## How this is different from a group chat\n\nEveryone sees the same tournament page. Rules are written once. Standings update in public. When something goes wrong, there is a record — not a missing message at 2 a.m.\n\nWe are still early. Features will improve with feedback. If you compete or host, tell us what slows you down. The goal is simple: cleaner competition, clearer information, and a platform that feels like a clubhouse rather than another scattered app.\n\nPlay fair. Respect everyone. See you in the lobby.`,
  category: "Announcement",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-01-15T10:00:00.000Z",
  featured: true,
  status: "published",
};
