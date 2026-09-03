/** Seed / fallback news when platform_news table is empty. Admin can add real rows in Supabase. */
import { NEWS_SEED_A } from "./news-seed-a";
import { NEWS_SEED_B } from "./news-seed-b";

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

export const NEWS_SEED: NewsArticle[] = [...NEWS_SEED_A, ...NEWS_SEED_B];
