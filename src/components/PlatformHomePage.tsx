/**
 * NepARENA platform homepage — FEED FIRST with For You / Following tabs.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { SocialFeed } from "@/components/SocialFeed";
import { StreakAssistant } from "@/components/StreakAssistant";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Newspaper, Info, Users, MessageCircle, Trophy, Swords } from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { cn } from "@/lib/utils";

export function PlatformHomePage() {
  const [pillsVisible, setPillsVisible] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [feedMode, setFeedMode] = useState<"for_you" | "following">("for_you");
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

      <div className="mx-auto max-w-md px-3 pt-2">
        <StoriesRow />
      </div>

      <div
        className={cn(
          "sticky top-12 z-30 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur-md transition-all duration-300",
          pillsVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
        data-tour="about-members"
      >
        <div className="mx-auto flex max-w-3xl gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
          <Link
            to="/messages"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Messages
          </Link>
          <Link
            to="/members"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <Users className="h-3.5 w-3.5 text-sky-400" />
            Players
          </Link>
          <Link
            to="/tournaments"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <Swords className="h-3.5 w-3.5 text-sky-400" />
            Tournaments
          </Link>
          <Link
            to="/about"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <Info className="h-3.5 w-3.5 text-sky-400" />
            Organizers
          </Link>
          <Link
            to="/hall-of-fame"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Hall of Fame
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

          <div className="mb-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(
              [
                ["for_you", "For You"],
                ["following", "Following"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFeedMode(id);
                  setFeedKey((k) => k + 1);
                }}
                className={cn(
                  "flex-1 rounded-full py-2 text-xs font-semibold transition",
                  feedMode === id
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <SocialFeed key={feedKey} mode={feedMode} hideComposer />
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
