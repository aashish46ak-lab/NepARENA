import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, Component, type ErrorInfo, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { RoleRedirect } from "@/components/RoleRedirect";
import { disablePWA } from "@/lib/pwa-register";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function SafeErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[SafeErrorComponent]", error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-xl border-2 border-red-500 bg-white/95 p-6 text-center shadow-lg">
        <h1 className="text-xl font-semibold text-black">This page didn't load</h1>
        <p className="mt-2 text-sm text-red-600 break-words">
          {error?.message || "Something went wrong."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Go home
          </button>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md border border-black px-4 py-2 text-sm text-black"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

class ClientErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ClientErrorBoundary]", error, info.componentStack);
    reportLovableError(error, {
      boundary: "client_error_boundary",
      stack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="rounded-xl border-2 border-red-500 bg-white/95 p-6 shadow-lg">
            <h1 className="text-lg font-semibold text-black">Something went wrong</h1>
            <p className="mt-2 max-w-sm text-sm text-red-600 break-words">
              {this.state.error.message}
            </p>
            <button
              type="button"
              className="mt-4 rounded-md bg-black px-4 py-2 text-sm text-white"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NepARENA — Tournament Platform" },
      {
        name: "description",
        content:
          "NepARENA is the multi-organizer esports tournament platform for Nepal.",
      },
      { name: "author", content: "NepARENA" },
      { name: "theme-color", content: "#ffffff" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "NepARENA — Tournament Platform" },
      {
        property: "og:description",
        content: "Multi-organizer esports tournament platform for Nepal.",
      },
      { property: "og:site_name", content: "NepARENA" },
      { property: "og:url", content: "https://neparena.xyz" },
      {
        property: "og:image",
        content: "https://neparena.xyz/neparena-logo.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/neparena-logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/neparena-logo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: SafeErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Transparent body + checkerboard on html so theme cannot "paint over" content */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
html{
  margin:0;min-height:100%;
  background-color:#f0f0f0;
  background-image:
    linear-gradient(45deg,#ddd 25%,transparent 25%),
    linear-gradient(-45deg,#ddd 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#ddd 75%),
    linear-gradient(-45deg,transparent 75%,#ddd 75%);
  background-size:24px 24px;
  background-position:0 0,0 12px,12px -12px,-12px 0;
}
body{
  margin:0;min-height:100%;
  background:transparent!important;
  color:#111!important;
}
#neparena-debug-banner{
  position:fixed;top:0;left:0;right:0;z-index:2147483647;
  background:#16a34a;color:#fff;font:600 13px/1.4 system-ui,sans-serif;
  text-align:center;padding:8px 12px;
  pointer-events:none;
}
`,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* Always in HTML (SSR) — if you never see this, HTML itself failed */}
        <div id="neparena-debug-banner">
          DEBUG: HTML shell OK · if this stays green, React may still be loading · checkerboard = transparent body
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    void disablePWA();
    const el = document.getElementById("neparena-debug-banner");
    if (el) {
      el.textContent =
        "DEBUG: React mounted OK · transparent body · theme is NOT covering content";
      el.style.background = "#2563eb";
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClientErrorBoundary>
          <RoleRedirect />
          <Outlet />
          <Toaster richColors position="top-right" />
        </ClientErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
