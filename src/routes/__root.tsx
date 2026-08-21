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
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import { OnboardingTour } from "@/components/OnboardingTour";
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

const ENABLE_LOGIN_POPUPS = false;
const ENABLE_ADSENSE = true;
const ADSENSE_CLIENT = "ca-pub-3033911443659343";

function BrandErrorBox({
  title,
  message,
  actions,
}: {
  title: string;
  message?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/12 bg-[#121214] p-8 text-center shadow-2xl">
        <img
          src="/neparena-logo.png"
          alt="NepARENA"
          className="mx-auto h-16 w-16 rounded-2xl object-contain ring-1 ring-white/15"
          onError={(e) => {
            e.currentTarget.src = "/pwa-192x192.png";
          }}
        />
        <h1 className="mt-5 text-xl font-semibold">{title}</h1>
        {message && <p className="mt-2 break-words text-sm text-neutral-400">{message}</p>}
        {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <BrandErrorBox
      title="Page not found"
      message="This page doesn’t exist or was moved."
      actions={
        <Link to="/" className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-black">
          Go home
        </Link>
      }
    />
  );
}

function SafeErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <BrandErrorBox
      title="Something went wrong"
      message={error.message}
      actions={
        <>
          <button
            type="button"
            className="rounded-full bg-white px-5 py-2 text-sm text-black"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Go home
          </button>
          <button
            type="button"
            className="rounded-full border border-white/30 px-5 py-2 text-sm"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
        </>
      }
    />
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
        <BrandErrorBox
          title="Something went wrong"
          message={this.state.error.message}
          actions={
            <button
              type="button"
              className="rounded-full bg-white px-5 py-2 text-sm text-black"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          }
        />
      );
    }
    return this.props.children;
  }
}

function useDeferredAdSense() {
  useEffect(() => {
    if (!ENABLE_ADSENSE || typeof document === "undefined") return;
    if (document.querySelector(`script[data-neparena-adsense]`)) return;

    const inject = () => {
      if (document.querySelector(`script[data-neparena-adsense]`)) return;
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      s.crossOrigin = "anonymous";
      s.dataset.neparenaAdsense = "1";
      document.head.appendChild(s);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ric = (window as any).requestIdleCallback as
      | undefined
      | ((cb: () => void, opts?: { timeout: number }) => number);
    if (typeof ric === "function") {
      const id = ric(inject, { timeout: 4000 });
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cic = (window as any).cancelIdleCallback as undefined | ((n: number) => void);
        cic?.(id);
      };
    }
    const t = window.setTimeout(inject, 2500);
    return () => window.clearTimeout(t);
  }, []);
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
      { name: "google-adsense-account", content: ADSENSE_CLIENT },
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
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
      { rel: "icon", href: "/pwa-192x192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "dns-prefetch", href: "https://pagead2.googlesyndication.com" },
      { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
      { rel: "preconnect", href: "https://jssexmnwpwjzkqxkevqf.supabase.co", crossOrigin: "anonymous" },
      { rel: "preload", href: "/neparena-logo.png", as: "image", type: "image/png" },
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
              "html,body{margin:0;min-height:100%;background:#0a0a0a;color:#f5f5f5}" +
              "html.neparena-splash-pending [data-neparena-app]{visibility:hidden!important}" +
              "html.light,html.light body{background:#f3efe6;color:#14120f}",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('neparena-theme');var r=document.documentElement;if(t==='light'){r.classList.add('light');r.classList.remove('dark');r.style.colorScheme='light';}else{r.classList.add('dark');r.classList.remove('light');r.style.colorScheme='dark';}var k='neparena_splash_seen_v3';if(!sessionStorage.getItem(k)&&location.pathname==='/'){r.classList.add('neparena-splash-pending');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window === "undefined") return true;
    if (!shouldShowSplash()) return true;
    const p = window.location.pathname;
    return p !== "/" && p !== "";
  });

  useDeferredAdSense();

  useEffect(() => {
    void registerPWA();
  }, []);

  const showSplash = !splashDone && (pathname === "/" || pathname === "");

  useEffect(() => {
    if (!showSplash) {
      try {
        document.documentElement.classList.remove("neparena-splash-pending");
      } catch {
        /* ignore */
      }
    }
  }, [showSplash]);

  const finishSplash = () => {
    setSplashDone(true);
    try {
      document.documentElement.classList.remove("neparena-splash-pending");
    } catch {
      /* ignore */
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClientErrorBoundary>
          <CookieConsent />
          <GoogleAnalytics />
          {showSplash && <SplashScreen onDone={finishSplash} />}
          <div data-neparena-app style={{ visibility: showSplash ? "hidden" : "visible" }}>
            <RoleRedirect />
            <Outlet />
            {!showSplash && <OnboardingTour />}
          </div>
          <Toaster richColors position="top-right" />
        </ClientErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export { ENABLE_LOGIN_POPUPS };
