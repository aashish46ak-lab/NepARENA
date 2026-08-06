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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">
          {error?.message ||
            "Something went wrong. Try again or open in Chrome."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              try {
                sessionStorage.clear();
                localStorage.clear();
              } catch {}
              window.location.href = "/?nocache=" + Date.now();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reload clean
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
        content:
          "The official home of competitive eFootball in Nepal. Tournaments, players, hall of fame, and community.",
      },
      {
        name: "google-adsense-account",
        content: "ca-pub-3033911443659343",
      },
      { name: "theme-color", content: "#0b1220" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://efootballnepal.vercel.app/" },
      { property: "og:site_name", content: "eFootball Nepal" },
      {
        property: "og:title",
        content: "eFootball Nepal — Tournaments & Community",
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
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{margin:0;min-height:100%;background:#0b1220;color:#e8eefc}#efn-boot{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:#0b1220;color:#e8eefc;font-family:system-ui,sans-serif;text-align:center;padding:24px}#efn-boot h1{margin:0;font-size:1.5rem}#efn-boot p{margin:0;opacity:.75;font-size:.9rem}#efn-err{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#b91c1c;color:#fff;padding:10px 14px;font:13px/1.4 system-ui,sans-serif;display:none;max-height:40vh;overflow:auto}`,
          }}
        />
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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister(); });
      });
    }
    if ("caches" in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) { caches.delete(k); });
      });
    }
  } catch (e) {}

  function showErr(msg) {
    try {
      var el = document.getElementById("efn-err");
      if (!el) {
        el = document.createElement("div");
        el.id = "efn-err";
        document.body.appendChild(el);
      }
      el.style.display = "block";
      el.textContent = "Error: " + msg;
    } catch (e) {}
  }

  window.addEventListener("error", function (e) {
    showErr(e && e.message ? e.message : String(e));
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    showErr(r && r.message ? r.message : String(r));
  });

  // If React never paints a header, show recovery UI instead of infinite blue
  window.setTimeout(function () {
    try {
      if (document.querySelector("header")) {
        var boot = document.getElementById("efn-boot");
        if (boot) boot.remove();
        return;
      }
      var boot = document.getElementById("efn-boot");
      if (boot) {
        boot.innerHTML =
          "<h1>eFootball Nepal</h1>" +
          "<p>App could not start on this browser.</p>" +
          "<p><a href=\"/?nocache=" +
          Date.now() +
          "\" style=\"color:#7dd3fc\">Tap to reload</a></p>" +
          "<p style=\"font-size:12px;opacity:.6\">Try Chrome · clear site data · disable Shields</p>";
      }
    } catch (e) {}
  }, 4000);
})();
`,
          }}
        />
      </head>
      <body>
        <div id="efn-boot">
          <h1>eFootball Nepal</h1>
          <p>Loading…</p>
        </div>
        {children}
        <div id="efn-err" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Remove boot splash once app mounted
    const boot = document.getElementById("efn-boot");
    if (boot) boot.remove();

    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    });
  }, []);

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
