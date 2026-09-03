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

export const ARTICLE_7: NewsArticle = {
  id: "seed-mobile",
  slug: "using-neparena-on-mobile",
  title: "Using NepARENA on mobile",
  excerpt: "Registration, match checks, and result submission from a phone.",
  body: `Most players open NepARENA from a phone between queues and daily routines. The interface is mobile-first.\n\n## Tips\nAdd the site to your home screen for faster return visits. Keep notifications on if you use match reminders. Upload clear screenshots when submitting results. Use the tournament page as the source of truth even when chat is quiet.\n\n## If something looks broken\nRefresh first. Confirm the matchday was published. Contact the organizer for event issues, or support via the About page for account issues.`,
  category: "Guide",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-04-01T08:00:00.000Z",
  featured: false,
  status: "published",
};
