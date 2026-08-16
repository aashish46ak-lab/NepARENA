import { Link } from "@tanstack/react-router";
import { Swords, Users, MessageCircle, Gamepad2, Sparkles } from "lucide-react";

export function FeedEmptySuggestions({ mode = "for_you" }: { mode?: "for_you" | "following" }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/12 bg-gradient-to-b from-sky-500/10 to-transparent px-6 py-8 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-sky-500/15">
          <Sparkles className="h-5 w-5 text-sky-300" />
        </div>
        <p className="text-base font-semibold text-white">
          {mode === "following" ? "Follow people to fill this feed" : "The feed is just getting started"}
        </p>
        <p className="max-w-xs text-sm text-neutral-400">
          {mode === "following"
            ? "Follow organizers and players — their posts land here."
            : "Explore tournaments, organizers, and games while the community posts."}
        </p>
        <Link
          to="/auth"
          className="mt-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-100"
        >
          Join free
        </Link>
      </div>
      <p className="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Jump in</p>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/organizers"
          className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10"
        >
          <Users className="h-4 w-4 text-violet-300" />
          <span className="text-xs font-semibold text-white">Organizers</span>
          <span className="text-[10px] text-neutral-500">Follow communities</span>
        </Link>
        <Link
          to="/tournaments"
          className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10"
        >
          <Swords className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">Tournaments</span>
          <span className="text-[10px] text-neutral-500">Compete & climb</span>
        </Link>
        <Link
          to="/games"
          className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10"
        >
          <Gamepad2 className="h-4 w-4 text-emerald-300" />
          <span className="text-xs font-semibold text-white">Play games</span>
          <span className="text-[10px] text-neutral-500">Quiz & challenges</span>
        </Link>
        <Link
          to="/members"
          className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10"
        >
          <MessageCircle className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">Players</span>
          <span className="text-[10px] text-neutral-500">Find & message</span>
        </Link>
      </div>
    </div>
  );
}
