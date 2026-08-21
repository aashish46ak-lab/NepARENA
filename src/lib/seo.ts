/**
 * Shared SEO helpers for NepARENA (production).
 * Site: https://neparena.xyz
 */

export const SITE_URL = "https://neparena.xyz";
export const SITE_NAME = "NepARENA";
export const SITE_TITLE =
  "NepARENA – Multi-Organizer Esports Platform";
export const SITE_DESCRIPTION =
  "NepARENA is a multi-organizer esports platform where players and organizers worldwide run tournaments, communities, and competitive events.";
export const SITE_KEYWORDS =
  "NepARENA, esports, multi organizer, tournament platform, competitive gaming, eFootball, online tournaments, gaming community";
export const SITE_OG_IMAGE = `${SITE_URL}/neparena-logo.png`;
/** Square brand mark for favicons / JSON-LD (not the landscape banner). */
export const SITE_LOGO = `${SITE_URL}/apple-touch-icon.png`;
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

/** Absolute URL for a path */
export function absUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p === "/" ? "" : p}`;
}

/** Normalize image to absolute URL */
export function absImage(src?: string | null): string {
  if (!src) return SITE_OG_IMAGE;
  if (src.startsWith("http")) return src;
  return `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
}

/**
 * Build TanStack Router head() payload: meta + links (canonical).
 */
export function buildSeoHead(input: SeoInput = {}) {
  const title = input.title
    ? input.title.includes(SITE_NAME)
      ? input.title
      : `${input.title} — ${SITE_NAME}`
    : SITE_TITLE;
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
    // Open Graph
    { property: "og:type", content: type },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: title },
    { property: "og:locale", content: "en_US" },
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

/** Organization JSON-LD for root / homepage */
export function organizationJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    description: SITE_DESCRIPTION,
    foundingDate: "2026",
    founder: {
      "@type": "Person",
      name: FOUNDER_NAME,
    },
    sameAs: [] as string[],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "aashish46ak@gmail.com",
      areaServed: "Worldwide",
      availableLanguage: ["en"],
    },
  };
  return JSON.stringify(data);
}

/** WebSite JSON-LD */
export function websiteJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: SITE_LOGO,
      },
    },
    inLanguage: "en",
  };
  return JSON.stringify(data);
}

/** ProfilePage-style JSON-LD for organizer public pages */
export function organizerJsonLd(opts: {
  name: string;
  url: string;
  description?: string;
  logo?: string | null;
}): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: opts.name,
    url: opts.url,
    description: opts.description ?? `${opts.name} on ${SITE_NAME}`,
    logo: absImage(opts.logo),
    parentOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  return JSON.stringify(data);
}
