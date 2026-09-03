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

export const ARTICLE_5: NewsArticle = {
  id: "seed-standings",
  slug: "how-to-read-standings-and-brackets",
  title: "How to read standings and brackets",
  excerpt: "Points, goal difference, groups, and knockout trees in plain language.",
  body: `## League or group standings\nTypical columns: played, won/drawn/lost, goals for/against, goal difference, and points (often 3 for a win, 1 for a draw). Sort order is usually points, then goal difference, then goals scored — confirm on event rules.\n\n## Knockout brackets\nWinners advance; a loss usually eliminates you unless the format says otherwise. Pending matches leave the next slot empty until a result is recorded.\n\n## Why public standings matter\nEveryone shares the same table. That reduces arguments and helps late joiners understand the event without scrolling chat history.`,
  category: "Guide",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-03-12T09:00:00.000Z",
  featured: false,
  status: "published",
};
