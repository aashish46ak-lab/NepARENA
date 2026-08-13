/**
 * Google Analytics 4 — client tracking for NepARENA
 * Measurement ID: G-72Q6FDC8T9
 */

export const GA_MEASUREMENT_ID =
  (typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_GA_MEASUREMENT_ID) ||
  "G-72Q6FDC8T9";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsEvent =
  | "login"
  | "sign_up"
  | "tournament_registration"
  | "tournament_creation"
  | "match_result_submission"
  | "profile_view"
  | "organizer_follow"
  | "tournament_follow"
  | "search"
  | "notification_click"
  | "push_notification_open"
  | "community_join"
  | "external_link_click"
  | "file_download"
  | "game_play"
  | "page_view";

let initialized = false;

export function initGA(): void {
  if (typeof window === "undefined" || initialized) return;
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "disabled") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false, // we send manually on route changes
    anonymize_ip: true,
  });

  const existing = document.querySelector(
    `script[data-neparena-ga="${GA_MEASUREMENT_ID}"]`,
  );
  if (!existing) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    s.dataset.neparenaGa = GA_MEASUREMENT_ID;
    document.head.appendChild(s);
  }

  initialized = true;
}

export function trackPageView(path: string, title?: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(
  name: AnalyticsEvent | string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined" || !window.gtag) return;
  const cleaned: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) cleaned[k] = v;
    }
  }
  window.gtag("event", name, cleaned);
}

/** Convenience wrappers used across the app */
export const analytics = {
  login: (method = "email") => trackEvent("login", { method }),
  signUp: (method = "email") => trackEvent("sign_up", { method }),
  tournamentRegistration: (tournamentId: string, name?: string) =>
    trackEvent("tournament_registration", {
      tournament_id: tournamentId,
      tournament_name: name,
    }),
  tournamentCreation: (tournamentId: string) =>
    trackEvent("tournament_creation", { tournament_id: tournamentId }),
  matchResult: (matchId: string) =>
    trackEvent("match_result_submission", { match_id: matchId }),
  profileView: (profileId: string) =>
    trackEvent("profile_view", { profile_id: profileId }),
  organizerFollow: (organizerId: string, slug?: string) =>
    trackEvent("organizer_follow", {
      organizer_id: organizerId,
      organizer_slug: slug,
    }),
  tournamentFollow: (tournamentId: string) =>
    trackEvent("tournament_follow", { tournament_id: tournamentId }),
  search: (query: string) => trackEvent("search", { search_term: query }),
  notificationClick: (id?: string) =>
    trackEvent("notification_click", { notification_id: id }),
  pushOpen: () => trackEvent("push_notification_open"),
  communityJoin: (id: string) => trackEvent("community_join", { community_id: id }),
  externalLink: (url: string) => trackEvent("external_link_click", { link_url: url }),
  fileDownload: (fileName: string) =>
    trackEvent("file_download", { file_name: fileName }),
  gamePlay: (game: string) => trackEvent("game_play", { game_name: game }),
};
