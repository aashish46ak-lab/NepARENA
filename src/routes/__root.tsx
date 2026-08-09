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
import { SplashScreen } from "@/components/SplashScreen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#061226] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-white">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-white">Page not found</h2>
        <p className="mt-2 text-sm text-blue-200/60">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
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
    <div className="flex min-h-screen items-center justify-center bg-[#061226] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-blue-200/60 break-words">
          {error?.message || "Something went wrong."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                for (const k of Object.keys(sessionStorage)) {
                  if (k.startsWith("tanstack_router_reload")) sessionStorage.removeItem(k);
                }
              } catch {}
              window.location.href = "/";
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </button>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

/** Catches client render crashes so the tree is not left fully blank. */
class ClientErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ClientErrorBoundary", error, info.componentStack);
    reportLovableError(error, {
      boundary: "client_error_boundary",
      stack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#061226] px-4 text-center">
          <img
            src="/neparena-logo.png"
            alt="NepARENA"
            className="h-16 w-16 rounded-2xl object-cover"
          />
          <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
          <p className="max-w-sm text-sm text-blue-200/60 break-words">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
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
          "NepARENA is the multi-organizer esports tournament platform. Host, compete, and follow organizers across Nepal.",
      },
      { name: "author", content: "NepARENA" },
      { name: "theme-color", content: "#061226" },
      { name: "robots", content: "index, follow" },
      {
        name: "google-adsense-account",
        content: "ca-pub-3033911443659343",
      },
      { property: "og:title", content: "NepARENA — Tournament Platform" },
      {
        property: "og:description",
        content: "Multi-organizer esports tournament platform for Nepal.",
      },
      { property: "og:site_name", content: "NepARENA" },
      {
        property: "og:image",
        content: "https://neparena.vercel.app/neparena-logo.png",
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
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{margin:0;min-height:100%;background:#061226;color:#e8eefc}#root{min-height:100vh}",
          }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3033911443659343"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}if("caches"in window){caches.keys().then(function(k){k.forEach(function(n){caches.delete(n)})})}var keys=[];for(var i=0;i<sessionStorage.length;i++){var k=sessionStorage.key(i);if(k&&k.indexOf("tanstack_router_reload")===0)keys.push(k)}keys.forEach(function(k){sessionStorage.removeItem(k)})}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[#061226] text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClientErrorBoundary>
          <SplashScreen maxMs={1300} />
          <RoleRedirect />
          <Outlet />
          <Toaster richColors position="top-right" />
        </ClientErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
