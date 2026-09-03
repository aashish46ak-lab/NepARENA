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

export const ARTICLE_8: NewsArticle = {
  id: "seed-roadmap-voice",
  slug: "building-in-public-what-comes-next",
  title: "Building in public: what comes next",
  excerpt: "Priorities: clearer notifications, smoother registration, stronger public pages, more guides.",
  body: `NepARENA is young. We balance polish with real events that need to run this week.\n\n## Near-term focus\nClearer match reminders, smoother registration for organizers, stronger public share pages, and more educational content for newcomers.\n\n## How to influence the roadmap\nSend specific feedback: confusing registration fields, missing standings columns, hard-to-find next matches. Specific reports beat vague complaints.\n\nThank you for testing early and treating opponents with respect.`,
  category: "Announcement",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-04-15T10:00:00.000Z",
  featured: false,
  status: "published",
};
