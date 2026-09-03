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

export const ARTICLE_6: NewsArticle = {
  id: "seed-ads-support",
  slug: "how-neparena-stays-free-to-use",
  title: "How NepARENA stays free to use",
  excerpt: "Hosting costs, optional ads, and what we will not do with private competition data.",
  body: `Running a live tournament platform costs money: servers, database, storage, and development.\n\n## Our approach\nCore tournament features stay available without a paywall for normal players. We may show advertisements including Google AdSense to help cover infrastructure. Ads should not block fixtures, standings, or required result submission.\n\n## What we do not do\nWe do not sell your private messages or treat match results as a data product for unrelated third parties. See the Privacy Policy for cookies and partners.\n\nProduct quality comes first. If ad placement hurts usability, tell us.`,
  category: "Announcement",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-03-20T12:00:00.000Z",
  featured: false,
  status: "published",
};
