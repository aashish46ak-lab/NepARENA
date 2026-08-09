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
    <div className="flex min-h-screen items-center justify-center bg-[#050b16] px-4">
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

function SafeErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050b16] px-4">
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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050b16] px-4 text-center">
          <img src="/neparena-logo.png" alt="NepARENA" className="h-16 w-16 rounded-2xl object-cover" />
          <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
          <p className="max-w-sm text-sm text-blue-200/60 break-words">{this.state.error.message}</p>
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
      { name: "theme-color", content: "#050b16" },
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
  errorComponent: SafeErrorComponent,
});

/** Professional boot splash — pure HTML/CSS/JS, not controlled by React state. */
const BOOT_SPLASH_CSS = `
#neparena-boot-splash{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:radial-gradient(ellipse 100% 80% at 50% -10%,#1a3a6e 0%,#0c1b36 42%,#050b16 100%);transition:opacity .55s ease,transform .55s ease;overflow:hidden}
#neparena-boot-splash.out{opacity:0;transform:scale(1.04);pointer-events:none}
#neparena-boot-splash .na-orb{position:absolute;border-radius:50%;filter:blur(40px);opacity:.45;animation:na-float 6s ease-in-out infinite alternate}
#neparena-boot-splash .na-orb.a{width:220px;height:220px;background:#3b82f6;top:12%;left:10%;animation-delay:0s}
#neparena-boot-splash .na-orb.b{width:180px;height:180px;background:#22d3ee;bottom:15%;right:12%;animation-delay:1s}
#neparena-boot-splash .na-orb.c{width:120px;height:120px;background:#818cf8;top:40%;right:20%;animation-delay:.5s}
#neparena-boot-splash .na-core{position:relative;display:flex;flex-direction:column;align-items:center;gap:22px;z-index:1}
#neparena-boot-splash .na-ring{position:absolute;inset:-18px;border-radius:34px;border:1px solid rgba(125,211,252,.25);animation:na-spin 4s linear infinite}
#neparena-boot-splash .na-ring::before{content:"";position:absolute;top:-3px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#38bdf8;box-shadow:0 0 12px #38bdf8}
#neparena-boot-splash .na-logo-wrap{position:relative;width:96px;height:96px}
#neparena-boot-splash .na-logo{width:96px;height:96px;border-radius:26px;object-fit:cover;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 24px 60px rgba(0,0,0,.5);animation:na-pop .85s cubic-bezier(.16,1,.3,1) both}
#neparena-boot-splash .na-glow{position:absolute;inset:-10px;border-radius:32px;background:rgba(56,189,248,.35);filter:blur(18px);animation:na-pulse 1.8s ease-in-out infinite}
#neparena-boot-splash .na-brand{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:#93c5fd;font-weight:600;animation:na-fade-up .7s .15s both}
#neparena-boot-splash .na-title{font-size:22px;font-weight:800;color:#f0f7ff;letter-spacing:.02em;animation:na-fade-up .7s .25s both}
#neparena-boot-splash .na-sub{font-size:12px;color:rgba(147,197,253,.45);animation:na-fade-up .7s .35s both}
#neparena-boot-splash .na-track{width:200px;height:3px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;animation:na-fade-up .7s .4s both}
#neparena-boot-splash .na-bar{height:100%;width:42%;border-radius:99px;background:linear-gradient(90deg,#22d3ee,#60a5fa,#a78bfa);animation:na-slide 1.05s ease-in-out infinite}
@keyframes na-pop{from{opacity:0;transform:scale(.7) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes na-fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes na-slide{0%{transform:translateX(-130%)}100%{transform:translateX(280%)}}
@keyframes na-pulse{0%,100%{opacity:.35;transform:scale(.95)}50%{opacity:.8;transform:scale(1.08)}}
@keyframes na-spin{to{transform:rotate(360deg)}}
@keyframes na-float{from{transform:translate(0,0)}to{transform:translate(20px,-18px)}}
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{margin:0;min-height:100%;background:#050b16;color:#e8eefc}#root{min-height:100vh}" +
              BOOT_SPLASH_CSS,
          }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3033911443659343"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}if("caches"in window){caches.keys().then(function(k){k.forEach(function(n){caches.delete(n)})})}}catch(e){}function killSplash(){var el=document.getElementById("neparena-boot-splash");if(!el||el.classList.contains("out"))return;el.classList.add("out");setTimeout(function(){try{el.remove()}catch(e){}},600)}setTimeout(killSplash,1700);document.addEventListener("DOMContentLoaded",function(){setTimeout(killSplash,1700)});})();`,
          }}
        />
      </head>
      <body className="bg-[#050b16] text-foreground antialiased" suppressHydrationWarning>
        {/* Boot splash — outside React app state; auto-removed by script */}
        <div id="neparena-boot-splash" suppressHydrationWarning>
          <div className="na-orb a" />
          <div className="na-orb b" />
          <div className="na-orb c" />
          <div className="na-core">
            <div className="na-logo-wrap">
              <div className="na-glow" />
              <div className="na-ring" />
              <img
                className="na-logo"
                src="/android-chrome-512x512.png"
                alt="NepARENA"
                width={96}
                height={96}
              />
            </div>
            <div className="na-brand">NepARENA</div>
            <div className="na-title">Tournament Platform</div>
            <div className="na-sub">Host · Compete · Follow</div>
            <div className="na-track">
              <div className="na-bar" />
            </div>
          </div>
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
    // Hard safety: never leave boot splash on top of the app
    const t = setTimeout(() => {
      const el = document.getElementById("neparena-boot-splash");
      if (el) {
        el.classList.add("out");
        setTimeout(() => el.remove(), 600);
      }
    }, 1800);
    return () => clearTimeout(t);
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
