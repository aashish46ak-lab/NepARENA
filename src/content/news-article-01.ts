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

export const ARTICLE_1: NewsArticle = {
  id: "seed-how-join",
  slug: "how-to-join-your-first-tournament",
  title: "How to join your first tournament on NepARENA",
  excerpt: "Step-by-step for new players: account, profile, find a cup, register, and play match day.",
  body: `Joining an online tournament should not require decoding a 200-message group chat.\n\n## 1. Create an account and finish your profile\nSign up with an email you can access. Add a clear display name and avatar. Keep your in-game name consistent with registration forms.\n\n## 2. Browse tournaments and organizers\nCheck registration status, format, start date, and rules on the tournament page. Only join cups you can finish.\n\n## 3. Register while the window is open\nSubmit the form accurately. Wait for approval if the organizer reviews entries manually.\n\n## 4. Follow fixtures on the tournament page\nNote your opponent, deadline, and how to submit a score when required.\n\n## 5. Play, report, move on\nPlay within the rules. Submit results with evidence when asked. Use the report path for disputes instead of only private chat.\n\nThat loop — find, join, play, report, follow standings — gets faster every time.`,
  category: "Guide",
  author: "NepARENA",
  cover_url: null,
  published_at: "2026-02-01T09:00:00.000Z",
  featured: true,
  status: "published",
};
