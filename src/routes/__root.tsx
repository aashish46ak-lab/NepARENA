import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, Component, type ErrorInfo, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { RoleRedirect } from "@/components/RoleRedirect";
import { SplashScreen, shouldShowSplash } from "@/components/SplashScreen";
import { InstallFAB } from "@/components/InstallFAB";
import { registerPWA } from "@/lib/pwa-register";
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_URL,
  SITE_NAME,
  SITE_OG_IMAGE,
  FOUNDER_NAME,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

/** Set true after AdSense / site verification is complete */
const ENABLE_LOGIN_POPUPS = false;
/** Set true to show Install FAB again */
const ENABLE_INSTALL_FAB = false;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function SafeErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-red-400 break-words">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            className="rounded-md bg-white px-4 py-2 text-sm text-black"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Go home
          </button>
          <button
            type="button"
            className="rounded-md border border-white/30 px-4 py-2 text-sm"
            onClick={() => {
              router.invalidate();
              reset();
            }}
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
    console.error(error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-center text-white">
          <div>
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-red-400">{this.state.error.message}</p>
            <button
              type="button"
              className="mt-4 rounded-md bg-white px-4 py-2 text-sm text-black"
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
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "keywords", content: SITE_KEYWORDS },
      { name: "author", content: FOUNDER_NAME },
      {
        name: "robots",
        content:
          "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "googlebot", content: "index, follow" },
      { name: "google-adsense-account", content: "ca-pub-3033911443659343" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: SITE_NAME },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: SITE_OG_IMAGE },
      { property: "og:image:alt", content: SITE_NAME },
      { property: "og:locale", content: "en_NP" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: SITE_OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: SITE_URL },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/neparena-logo.png", type: "image/png", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: organizationJsonLd(),
      },
      {
        type: "application/ld+json",
        children: websiteJsonLd(),
      },
      {
        async: true,
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3033911443659343",
        crossOrigin: "anonymous",
      },
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
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{margin:0;min-height:100%;background:#0a0a0a;color:#f5f5f5}",
          }}
        />
      </head>
      <body className="bg-[#0a0a0a] text-foreground antialiased" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // sessionStorage: show cinematic splash only once per browser session
  const [splashDone, setSplashDone] = useState(() => !shouldShowSplash());

  useEffect(() => {
    void registerPWA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClientErrorBoundary>
          {!splashDone && (
            <SplashScreen onDone={() => setSplashDone(true)} />
          )}
          <RoleRedirect />
          <Outlet />
          {ENABLE_INSTALL_FAB && <PlatformInstallFab />}
          <Toaster richColors position="top-right" />
        </ClientErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Install FAB only on platform paths — hidden on organizer pages */
function PlatformInstallFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const show =
    pathname === "/" ||
    pathname.startsWith("/organizers") ||
    pathname.startsWith("/following") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/ownership") ||
    pathname.startsWith("/platform");
  if (!show) return null;
  return <InstallFAB />;
}

export { ENABLE_LOGIN_POPUPS };
