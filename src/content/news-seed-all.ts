import { ARTICLE_0 } from "./news-article-00";
import { ARTICLE_1 } from "./news-article-01";
import { ARTICLE_2 } from "./news-article-02";
import { ARTICLE_3 } from "./news-article-03";
import { ARTICLE_4 } from "./news-article-04";
import { ARTICLE_5 } from "./news-article-05";
import { ARTICLE_6 } from "./news-article-06";
import { ARTICLE_7 } from "./news-article-07";
import { ARTICLE_8 } from "./news-article-08";
import { ARTICLE_9 } from "./news-article-09";

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

export const NEWS_SEED_ALL: NewsArticle[] = [
  ARTICLE_0,
  ARTICLE_1,
  ARTICLE_2,
  ARTICLE_3,
  ARTICLE_4,
  ARTICLE_5,
  ARTICLE_6,
  ARTICLE_7,
  ARTICLE_8,
  ARTICLE_9,
];
