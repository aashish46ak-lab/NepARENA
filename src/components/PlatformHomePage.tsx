/**
 * NepARENA platform homepage — FEED FIRST.
 * No old platform info hero. About Us / Members half-width pills (scroll-hide).
 */
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { SocialFeed } from "@/components/SocialFeed";
import { StreakAssistant } from "@/components/StreakAssistant";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const GoatVoteBooth = lazy(() =>
  import("@/components/GoatVoteBooth").then((m) => ({ default: m.GoatVoteBooth })),
);

export function PlatformHomePage() {
  const [pillsVisible, setPillsVisible] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      if (y < 40) setPillsVisible(true);
      else if (y > lastY.current + 8) setPillsVisible(false);
      else if (y < lastY.current - 8) setPillsVisible(true);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo onCreatePost={() => setComposerOpen(true)} />
      <StreakAssistant />

      {/* About Us | Members — each ~50% width */}
      <div
        className={cn(
          "sticky top-12 z-30 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur-md transition-all duration-300",
          pillsVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
        data-tour="about-members"
      >
        <div className="mx-auto flex max-w-3xl gap-2.5 px-4 py-2.5">
          <Link
            to="/about"
            className="flex min-w-0 flex-1 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
          >
            About Us
          </Link>
          <Link
            to="/members"
            className="flex min-w-0 flex-1 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
          >
            Members
          </Link>
        </div>
      </div>

      {/* FEED FIRST — platform announcements + user posts */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-md px-3 pb-8 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Feed</h2>
            <Link to="/feed" className="ml-auto text-xs font-medium text-sky-400 hover:underline">
              Open full feed
            </Link>
          </div>
          <SocialFeed
            mode="for_you"
            hideComposer
            forceComposer={composerOpen}
            onComposerClose={() => setComposerOpen(false)}
            onPosted={() => setComposerOpen(false)}
          />
        </div>
      </section>

      {/* Optional light secondary content below fold */}
      <section className="mx-auto max-w-md px-3 py-8">
        <Suspense fallback={null}>
          <GoatVoteBooth />
        </Suspense>
      </section>
    </PageShell>
  );
}
