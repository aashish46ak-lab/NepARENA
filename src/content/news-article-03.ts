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

export const ARTICLE_3: NewsArticle = {
  id: "seed-fair-play",
  slug: "fair-play-basics-for-online-cups",
  title: "Fair play basics for online cups",
  excerpt: "Identity, evidence, deadlines, and respectful dispute handling for players and hosts.",
  body: `Online competition needs a minimum standard of honesty.\n\n## Identity\nUse the account and in-game name you registered with. Account sharing to dodge losses breaks trust for the whole bracket.\n\n## Deadlines\nTreat published match windows seriously. Communicate early if rules allow a reschedule. Silence until the deadline creates walkovers.\n\n## Evidence\nWhen asked for a score screenshot or match ID, provide it promptly. Edited images that hide the result help nobody in a review.\n\n## Respect\nNo harassment, hate, or threats. Competitive passion is fine; abuse is not.\n\n## Disputes\nArgue from facts and rule text. Use report tools on the event. Public call-outs without evidence usually make things worse.`,
  category: "Community",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-02-20T08:30:00.000Z",
  featured: false,
  status: "published",
};
