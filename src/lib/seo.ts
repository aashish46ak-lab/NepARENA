/**
 * Shared SEO helpers for NepARENA (production).
 * Site: https://neparena.xyz
 *
 * Goal: entity pages (organizers, players, cups) always brand with NepARENA
 * so searches for “1234” / player names can surface “1234 · NepARENA”.
 */

export const SITE_URL = "https://neparena.xyz";
export const SITE_NAME = "NepARENA";

/** Primary SERP title — tournament hosting + eFootball intent */
export const SITE_TITLE =
  "NepARENA – Online Tournament Hosting Platform for eFootball & Esports";

export const SITE_DESCRIPTION =
  "Host and join eFootball and esports tournaments on NepARENA. Multi-organizer platform with live brackets, standings, registration, organizer pages, and player profiles — free to use.";

/** Keyword cluster for homepage & default pages (not a ranking guarantee alone) */
export const SITE_KEYWORDS = [
  "NepARENA",
  "tournament hosting",
  "best tournament hosting platform",
  "efootball tournament",
  "efootball tournament host",
  "host efootball tournament online",
  "online esports tournament platform",
  "multi organizer esports",
  "tournament brackets",
  "live standings",
  "esports organizer",
  "Nepal esports",
  "eFootball Nepal",
  "competitive gaming platform",
  "online cup registration",
].join(", ");

export const SITE_OG_IMAGE = `${SITE_URL}/neparena-cover.jpg`;
export const SITE_LOGO = `${SITE_URL}/neparena-logo.png`;
export const FOUNDER_NAME = "Ashish Khadka";

export type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  keywords?: string;
};

export function absUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p === "/" ? "" : p}`;
}

export function absImage(src?: string | null): string {
  if (!src) return SITE_OG_IMAGE;
  if (src.startsWith("http")) return src;
  return `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Always append brand once for SERP consistency */
export function brandTitle(entityTitle: string): string {
  const t = entityTitle.trim();
  if (!t) return SITE_TITLE;
  if (t.toLowerCase().includes(SITE_NAME.toLowerCase())) return t;
  return `${t} · ${SITE_NAME}`;
}

export function buildSeoHead(input: SeoInput = {}) {
  const title = input.title ? brandTitle(input.title) : SITE_TITLE;
  const description = input.description ?? SITE_DESCRIPTION;
  const url = absUrl(input.path ?? "/");
  const image = absImage(input.image);
  const keywords = input.keywords ?? SITE_KEYWORDS;
  const type = input.type ?? "website";

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { name: "author", content: FOUNDER_NAME },
    {
      name: "robots",
      content: input.noIndex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
    {
      name: "googlebot",
      content: input.noIndex ? "noindex, nofollow" : "index, follow",
    },
    { name: "application-name", content: SITE_NAME },
    { name: "apple-mobile-web-app-title", content: SITE_NAME },
    // Open Graph
    { property: "og:type", content: type },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:secure_url", content: image },
    { property: "og:image:alt", content: title },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:locale", content: "en_NP" },
    { property: "og:locale:alternate", content: "en_US" },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];

  const links: Array<Record<string, string>> = [
    { rel: "canonical", href: url },
  ];

  return { meta, links };
}

/** Homepage / platform Organization */
export function organizationJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": ["Organization", "SportsOrganization"],
    name: SITE_NAME,
    alternateName: ["Nep Arena", "NepARENA Esports"],
    url: SITE_URL,
    logo: SITE_LOGO,
    image: SITE_OG_IMAGE,
    description: SITE_DESCRIPTION,
    foundingDate: "2026",
    founder: {
      "@type": "Person",
      name: FOUNDER_NAME,
    },
    knowsAbout: [
      "eFootball tournaments",
      "esports tournament hosting",
      "online brackets",
      "multi-organizer platforms",
    ],
    areaServed: "Worldwide",
    sameAs: [] as string[],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "aashish46ak@gmail.com",
      areaServed: "Worldwide",
      availableLanguage: ["en", "ne"],
    },
  };
  return JSON.stringify(data);
}

/** WebSite + SearchAction (helps sitelinks / search box eligibility) */
export function websiteJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Nep Arena",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: ["en", "ne"],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: SITE_LOGO,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/organizers?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return JSON.stringify(data);
}

/** Organizer public page — name is searchable; parent is always NepARENA */
export function organizerJsonLd(opts: {
  name: string;
  url: string;
  description?: string;
  logo?: string | null;
  slug?: string;
}): string {
  const data = {
    "@context": "https://schema.org",
    "@type": ["Organization", "SportsOrganization"],
    name: opts.name,
    alternateName: opts.slug ? [opts.slug, `${opts.name} NepARENA`] : [`${opts.name} NepARENA`],
    url: opts.url,
    description:
      opts.description ??
      `${opts.name} is an esports tournament organizer on ${SITE_NAME}. Follow for cups, results, and community.`,
    logo: absImage(opts.logo),
    parentOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  return JSON.stringify(data);
}

/** Player profile JSON-LD */
export function playerJsonLd(opts: {
  name: string;
  url: string;
  description?: string;
  image?: string | null;
  username?: string | null;
}): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
    alternateName: opts.username
      ? [opts.username, `@${opts.username}`, `${opts.name} NepARENA`]
      : [`${opts.name} NepARENA`],
    url: opts.url,
    description:
      opts.description ??
      `${opts.name} is a player on ${SITE_NAME} — tournaments, results, and community.`,
    image: absImage(opts.image),
    memberOf: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  return JSON.stringify(data);
}

/** Keywords string for an entity page */
export function entityKeywords(
  name: string,
  extra: string[] = [],
): string {
  return [name, SITE_NAME, ...extra, "esports", "tournament", "efootball"].join(
    ", ",
  );
}
