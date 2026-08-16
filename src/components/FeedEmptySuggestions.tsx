import { Link } from "@tanstack/react-router";
import { Newspaper, Swords, Users, Info, MessageCircle, Gamepad2 } from "lucide-react";

export function FeedEmptySuggestions({ mode = "for_you" }: { mode?: "for_you" | "following" }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-6 py-8 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.06]">
          <Newspaper className="h-5 w-5 text-neutral-500" />
        </div>
        <p className="text-base font-semibold text-white">Your feed is quiet</p>
        <p className="max-w-xs text-sm text-neutral-500">
          {mode === "following"
            ? "Follow people and organizers — their posts will show up here."
            : "Nothing new right now. Explore the platform while the feed fills up."}
        </p>
      </div>
      <p className="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Suggestions</p>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/organizers" className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10">
          <Info className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">Visit organizers</span>
          <span className="text-[10px] text-neutral-500">Follow communities</span>
        </Link>
        <Link to="/tournaments" className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10">
          <Swords className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">Join a tournament</span>
          <span className="text-[10px] text-neutral-500">Compete & climb</span>
        </Link>
        <Link to="/members" className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10">
          <Users className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">Find players</span>
          <span className="text-[10px] text-neutral-500">Follow & message</span>
        </Link>
        <Link to="/messages" className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10">
          <MessageCircle className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">Open messages</span>
          <span className="text-[10px] text-neutral-500">Chat with players</span>
        </Link>
        <Link to="/games" className="col-span-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-amber-400/30 hover:bg-amber-500/10">
          <Gamepad2 className="h-4 w-4 text-amber-400" />
          <div>
            <span className="block text-xs font-semibold text-white">Play a quick game</span>
            <span className="text-[10px] text-neutral-500">Mini-games — warm up while feed is empty</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
