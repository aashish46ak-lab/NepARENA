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

export const ARTICLE_9: NewsArticle = {
  id: "seed-safety",
  slug: "staying-safe-in-online-competition",
  title: "Staying safe in online competition",
  excerpt: "Account security, scams to ignore, and when to report.",
  body: `## Account security\nDo not share passwords or one-time codes. Be careful with lookalike login links in private messages. Use unique passwords.\n\n## Common scams\nNobody from NepARENA will ask you to pay a random wallet for a verified badge. Unexpected payment requests are suspicious.\n\n## Harassment\nMute and report. Save evidence. You do not owe a reply to abuse.\n\n## Younger players\nUse the platform with a parent or guardian when required by your country. Do not share school, address, or phone numbers in public posts.\n\nSafety is part of fair play.`,
  category: "Community",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-05-01T09:00:00.000Z",
  featured: false,
  status: "published",
};
