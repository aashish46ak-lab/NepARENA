import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MESSI_PHOTO, RONALDO_PHOTO } from "@/lib/player-photos";
import { Button } from "@/components/ui/button";
import { Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "neparena_goat_voted";

type Counts = { messi: number; ronaldo: number };

async function loadCounts(): Promise<Counts> {
  try {
    const { data, error } = await supabase.from("goat_votes").select("option, votes");
    if (!error && data?.length) {
      const messi = data.find((r) => r.option === "messi")?.votes ?? 0;
      const ronaldo = data.find((r) => r.option === "ronaldo")?.votes ?? 0;
      return { messi: Number(messi), ronaldo: Number(ronaldo) };
    }
  } catch {
    /* table may not exist yet */
  }
  try {
    const raw = localStorage.getItem("neparena_goat_local_counts");
    if (raw) return JSON.parse(raw) as Counts;
  } catch {
    /* ignore */
  }
  return { messi: 0, ronaldo: 0 };
}

async function castVote(option: "messi" | "ronaldo"): Promise<Counts> {
  const current = await loadCounts();
  const next = {
    messi: current.messi + (option === "messi" ? 1 : 0),
    ronaldo: current.ronaldo + (option === "ronaldo" ? 1 : 0),
  };

  try {
    const { error } = await supabase.from("goat_votes").upsert(
      { option, votes: next[option], updated_at: new Date().toISOString() },
      { onConflict: "option" },
    );
    if (!error) return loadCounts();
  } catch {
    /* fall through to local */
  }

  localStorage.setItem("neparena_goat_local_counts", JSON.stringify(next));
  return next;
}

export function GoatVoteBooth() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);

  useEffect(() => {
    try {
      setVoted(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const { data: counts = { messi: 0, ronaldo: 0 }, isLoading } = useQuery({
    queryKey: ["goat_votes"],
    queryFn: loadCounts,
    refetchInterval: 30_000,
  });

  const total = counts.messi + counts.ronaldo;
  const messiPct = total ? Math.round((counts.messi / total) * 100) : 50;
  const ronaldoPct = total ? 100 - messiPct : 50;

  const vote = async (option: "messi" | "ronaldo") => {
    if (voted) {
      toast.message("You already voted on this device");
      return;
    }
    setBusy(true);
    try {
      const next = await castVote(option);
      localStorage.setItem(STORAGE_KEY, option);
      setVoted(option);
      qc.setQueryData(["goat_votes"], next);
      toast.success(option === "messi" ? "Voted Messi 🐐" : "Voted Ronaldo 🐐");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  };

  const sharePoll = async () => {
    const url = `${window.location.origin}/vote/goat`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Vote Your GOAT — NepARENA",
          text: "Messi or Ronaldo? Cast your vote on NepARENA",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Poll link copied — share only this vote");
      }
    } catch {
      /* cancel */
    }
  };

  return (
    <div
      id="goat-vote"
      className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 via-[#0b1220] to-black"
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/5 px-4 py-4 sm:px-6">
        <div className="text-left sm:text-center sm:flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400/90">
            Community poll
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
            VOTE YOUR GOAT
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Messi vs Ronaldo · one vote per device
          </p>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Total votes:{" "}
            <span className="tabular-nums text-white">
              {isLoading ? "…" : total.toLocaleString()}
            </span>
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-white/15"
          onClick={() => void sharePoll()}
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-0">
        <Side
          name="Messi"
          photo={MESSI_PHOTO}
          accent="from-sky-600/40"
          bar="bg-sky-500"
          votes={counts.messi}
          pct={messiPct}
          voted={voted === "messi"}
          disabled={!!voted || busy}
          onVote={() => void vote("messi")}
          busy={busy}
        />
        <Side
          name="Ronaldo"
          photo={RONALDO_PHOTO}
          accent="from-rose-600/40"
          bar="bg-rose-500"
          votes={counts.ronaldo}
          pct={ronaldoPct}
          voted={voted === "ronaldo"}
          disabled={!!voted || busy}
          onVote={() => void vote("ronaldo")}
          busy={busy}
        />
      </div>

      <div className="px-4 pb-4 pt-1 sm:px-6">
        <div className="flex h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700"
            style={{ width: `${messiPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700"
            style={{ width: `${ronaldoPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-semibold tabular-nums text-slate-400">
          <span className="text-sky-300">{messiPct}%</span>
          <span className="text-rose-300">{ronaldoPct}%</span>
        </div>
      </div>
    </div>
  );
}

function Side({
  name,
  photo,
  accent,
  bar,
  votes,
  pct,
  voted,
  disabled,
  onVote,
  busy,
}: {
  name: string;
  photo: string;
  accent: string;
  bar: string;
  votes: number;
  pct: number;
  voted: boolean;
  disabled: boolean;
  onVote: () => void;
  busy: boolean;
}) {
  return (
    <div className={cn("relative flex flex-col border-white/5 p-3 sm:p-4", name === "Messi" ? "border-r" : "")}>
      <div className={cn("absolute inset-0 bg-gradient-to-b to-transparent opacity-50", accent)} />
      <div className="relative flex flex-1 flex-col items-center">
        <div className="relative h-36 w-full overflow-hidden rounded-2xl ring-1 ring-white/15 sm:h-44">
          <img
            src={photo}
            alt={name}
            className="h-full w-full object-cover object-top"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=0f172a&color=fff`;
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
        </div>
        <p className="mt-3 text-base font-bold text-white sm:text-lg">{name}</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-white">{pct}%</p>
        <p className="text-xs tabular-nums text-slate-400">
          {votes.toLocaleString()} votes
        </p>
        <div className="mt-2 h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-white/10">
          <div className={cn("h-full rounded-full transition-all duration-700", bar)} style={{ width: `${pct}%` }} />
        </div>
        <Button
          size="sm"
          disabled={disabled}
          onClick={onVote}
          className={cn(
            "mt-3 w-full max-w-[140px] font-semibold",
            voted
              ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20"
              : name === "Messi"
                ? "bg-sky-500 text-white hover:bg-sky-400"
                : "bg-rose-500 text-white hover:bg-rose-400",
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : voted ? (
            "Your pick"
          ) : (
            `Vote ${name}`
          )}
        </Button>
      </div>
    </div>
  );
}
