import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, Component, type ErrorInfo, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { RoleRedirect } from "@/components/RoleRedirect";
import { SplashScreen } from "@/components/SplashScreen";
import { InstallFAB } from "@/components/InstallFAB";
import { registerPWA } from "@/lib/pwa-register";

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
      { title: "NepARENA — Tournament Platform" },
      {
        name: "description",
        content: "NepARENA multi-organizer esports tournament platform for Nepal.",
      },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "NepARENA" },
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
      { rel: "manifest", href: "/manifest.webmanifest" },
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
  const [splashDone, setSplashDone] = useState(false);

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
          <InstallFAB />
          <Toaster richColors position="top-right" />
        </ClientErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
