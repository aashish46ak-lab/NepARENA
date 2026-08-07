/* This file was generated from the historical commit tree and restores the repository state. */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { RoleRedirect } from "@/components/RoleRedirect";
import ComingSoon from "@/components/ComingSoon";
import { COMING_SOON } from "@/config/comingSoon";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">{error?.message || "Something went wrong."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              try {
                const keys = Object.keys(sessionStorage);
                for (const k of keys) {
                  if (k.startsWith("tanstack_router_reload")) {
                    sessionStorage.removeItem(k);
                  }
                }
              } catch {}
              window.location.href = "/";
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </button>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "eFootball Nepal — Tournaments, Community & Hall of Fame" },
      {
        name: "description",
        content: "The official home of competitive eFootball in Nepal. Tournaments, players, hall of fame, and community.",
      },
      { name: "author", content: "eFootball Nepal" },
      { name: "theme-color", content: "#0b1220" },
      {
        name: "google-adsense-account",
        content: "ca-pub-3033911443659343",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://efootballnepal.vercel.app/" },
      { property: "og:site_name", content: "eFootball Nepal" },
      {
        property: "og:title",
        content: "eFootball Nepal — Tournaments & Community",
      },
      {
        property: "og:description",
        content: "The official home of competitive eFootball in Nepal. Tournaments, players, hall of fame, and community.",
      },
      {
        property: "og:image",
        content: "https://efootballnepal.vercel.app/og-image.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: "/android-chrome-512x512.png",
        type: "image/png",
      },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3033911443659343"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    // Stop TanStack "reload once on error" from looping forever on mobile
    if (typeof sessionStorage !== "undefined") {
      var keys = Object.keys(sessionStorage);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf("tanstack_router_reload") === 0) {
          sessionStorage.removeItem(keys[i]);
        }
      }
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister(); });
      });
    }
    if ("caches" in window) {
      caches.keys().then(function (names) {
        names.forEach(function (n) { caches.delete(n); });
      });
    }
  } catch (e) {}
})();
`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // When Coming Soon is enabled, render only the landing page and do not mount
  // the rest of the app (AuthProvider, Outlet, etc.). This keeps the page
  // lightweight and independent from auth or data APIs.
  if (COMING_SOON) {
    return <ComingSoon />;
  }

  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleRedirect />
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
