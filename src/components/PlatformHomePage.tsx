/**
 * NepARENA platform homepage — FEED FIRST.
 * Compact About/Members pills with icons. No GOAT section.
 * + opens centered CreatePostModal overlay.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { SocialFeed } from "@/components/SocialFeed";
import { StreakAssistant } from "@/components/StreakAssistant";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Newspaper, Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlatformHomePage() {
  const [pillsVisible, setPillsVisible] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
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
      <PlatformTopBar showLogo onCreatePost={() => setPostOpen(true)} />
      <StreakAssistant />

      <div
        className={cn(
          "sticky top-12 z-30 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur-md transition-all duration-300",
          pillsVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
        data-tour="about-members"
      >
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-2">
          <Link
            to="/about"
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
          >
            <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            About Us
          </Link>
          <Link
            to="/members"
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
          >
            <Users className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            Members
          </Link>
        </div>
      </div>

      <section className="border-b border-white/5">
        <div className="mx-auto max-w-md px-3 pb-8 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Feed</h2>
            <Link to="/feed" className="ml-auto text-xs font-medium text-sky-400 hover:underline">
              Open full feed
            </Link>
          </div>
          <SocialFeed key={feedKey} mode="for_you" hideComposer />
        </div>
      </section>

      <CreatePostModal
        open={postOpen}
        onOpenChange={setPostOpen}
        onPosted={() => {
          setPostOpen(false);
          setFeedKey((k) => k + 1);
        }}
      />
    </PageShell>
  );
}
