import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { initGA, trackPageView } from "@/lib/analytics";

/**
 * Loads gtag once and sends page_view on every client navigation.
 */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const prev = useRef<string>("");

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const path = `${pathname}${search || ""}`;
    if (path === prev.current) return;
    prev.current = path;
    // small delay so document.title from route head settles
    const t = window.setTimeout(() => {
      trackPageView(path, document.title);
    }, 40);
    return () => window.clearTimeout(t);
  }, [pathname, search]);

  return null;
}
