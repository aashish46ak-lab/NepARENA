/** Seed / fallback news when platform_news table is empty. */
import { NEWS_SEED_ALL } from "./news-seed-all";

export type NewsArticle = {
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

export const NEWS_SEED: NewsArticle[] = NEWS_SEED_ALL;
