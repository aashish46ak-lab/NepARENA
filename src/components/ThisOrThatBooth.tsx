import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { playerPhotoUrl } from "@/lib/player-photos";
import { Button } from "@/components/ui/button";
import { Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Pair = { id: string; a: string; b: string; label: string };

const PAIRS: Pair[] = [
  { id: "salah_mbappe", a: "Mohamed Salah", b: "Kylian Mbappé", label: "Wing king" },
  { id: "haaland_lewa", a: "Erling Haaland", b: "Robert Lewandowski", label: "No.9" },
  { id: "neymar_vinicius", a: "Neymar Jr", b: "Vinícius Jr", label: "Flair" },
  { id: "debruyne_modric", a: "Kevin De Bruyne", b: "Luka Modrić", label: "Midfield maestro" },
  { id: "ramos_vd", a: "Sergio Ramos", b: "Virgil van Dijk", label: "Defensive rock" },
  { id: "iniesta_pirlo", a: "Andrés Iniesta", b: "Andrea Pirlo", label: "Deep creator" },
  { id: "henry_benzema", a: "Thierry Henry", b: "Karim Benzema", label: "Elite striker" },
];

function dayIndex() {
  const start = Date.UTC(2026, 0, 1);
  const now = Date.now();
  return Math.floor((now - start) / 86_400_000);
}

type Counts = { a: number; b: number };

async function loadCounts(pairId: string): Promise<Counts> {
  try {
    const { data, error } = await supabase
      .from("this_or_that_votes")
      .select("side, votes")
      .eq("pair_id", pairId);
    if (!error && data?.length) {
      return {
        a: Number(data.find((r) => r.side === "a")?.votes ?? 0),
        b: Number(data.find((r) => r.side === "b")?.votes ?? 0),
      };
    }
  } catch {
    /* table optional */
  }
  try {
    const raw = localStorage.getItem(`neparena_tot_${pairId}`);
    if (raw) return JSON.parse(raw) as Counts;
  } catch {
    /* ignore */
  }
  return { a: 0, b: 0 };
}

async function cast(pairId: string, side: "a" | "b"): Promise<Counts> {
  const cur = await loadCounts(pairId);
  const next = { a: cur.a + (side === "a" ? 1 : 0), b: cur.b + (side === "b" ? 1 : 0) };
  try {
    const { error } = await supabase.from("this_or_that_votes").upsert(
      {
        pair_id: pairId,
        side,
        votes: next[side],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pair_id,side" },
    );
    if (!error) return loadCounts(pairId);
  } catch {
    /* local */
  }
  localStorage.setItem(`neparena_tot_${pairId}`, JSON.stringify(next));
  return next;
}

export function ThisOrThatBooth() {
  const qc = useQueryClient();
  const pair = useMemo(() => PAIRS[dayIndex() % PAIRS.length]!, []);
  const storageKey = `neparena_tot_voted_${pair.id}`;
  const [voted, setVoted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setVoted(localStorage.getItem(storageKey));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const { data: counts = { a: 0, b: 0 }, isLoading } = useQuery({
    queryKey: ["this_or_that", pair.id],
    queryFn: () => loadCounts(pair.id),
    refetchInterval: 30_000,
  });

  const total = counts.a + counts.b;
  const aPct = total ? Math.round((counts.a / total) * 100) : 50;
  const bPct = total ? 100 - aPct : 50;

  const vote = async (side: "a" | "b") => {
    if (voted) {
      toast.message("Already voted today on this device");
      return;
    }
    setBusy(true);
    try {
      const next = await cast(pair.id, side);
      localStorage.setItem(storageKey, side);
      setVoted(side);
      qc.setQueryData(["this_or_that", pair.id], next);
      toast.success("Vote counted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/#this-or-that`;
    const text = `This or That: ${pair.a} vs ${pair.b} — vote on NepARENA`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "This or That — NepARENA", text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("Share text copied");
      }
    } catch {
      /* cancel */
    }
  };

  return (
    <div id="this-or-that" className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-violet-950/40 via-[#0b1220] to-black">
      <div className="flex items-start justify-between gap-2 border-b border-white/5 px-4 py-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300/90">
            Daily · This or That
          </p>
          <h2 className="mt-1 text-lg font-black text-white sm:text-xl">{pair.label}</h2>
          <p className="mt-1 text-xs text-slate-400">
            Total:{" "}
            <span className="tabular-nums text-white">
              {isLoading ? "…" : total.toLocaleString()}
            </span>
          </p>
        </div>
        <Button size="sm" variant="outline" className="border-white/15" onClick={() => void share()}>
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2">
        <Side
          name={pair.a}
          photo={playerPhotoUrl(pair.a)}
          pct={aPct}
          votes={counts.a}
          accent="from-violet-600/30"
          bar="bg-violet-500"
          voted={voted === "a"}
          disabled={!!voted || busy}
          busy={busy}
          onVote={() => void vote("a")}
          border
        />
        <Side
          name={pair.b}
          photo={playerPhotoUrl(pair.b)}
          pct={bPct}
          votes={counts.b}
          accent="from-fuchsia-600/30"
          bar="bg-fuchsia-500"
          voted={voted === "b"}
          disabled={!!voted || busy}
          busy={busy}
          onVote={() => void vote("b")}
        />
      </div>

      <div className="px-4 pb-4 pt-1 sm:px-6">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-violet-500 transition-all duration-700" style={{ width: `${aPct}%` }} />
          <div className="h-full bg-fuchsia-500 transition-all duration-700" style={{ width: `${bPct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums">
          <span className="text-violet-300">{aPct}%</span>
          <span className="text-fuchsia-300">{bPct}%</span>
        </div>
      </div>
    </div>
  );
}

function Side({
  name,
  photo,
  pct,
  votes,
  accent,
  bar,
  voted,
  disabled,
  busy,
  onVote,
  border,
}: {
  name: string;
  photo: string;
  pct: number;
  votes: number;
  accent: string;
  bar: string;
  voted: boolean;
  disabled: boolean;
  busy: boolean;
  onVote: () => void;
  border?: boolean;
}) {
  return (
    <div className={cn("relative p-3 sm:p-4", border && "border-r border-white/5")}>
      <div className={cn("absolute inset-0 bg-gradient-to-b to-transparent opacity-60", accent)} />
      <div className="relative flex flex-col items-center">
        <div className="h-32 w-full overflow-hidden rounded-2xl ring-1 ring-white/15 sm:h-40">
          <img
            src={photo}
            alt={name}
            className="h-full w-full object-cover object-top"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = playerPhotoUrl(name);
            }}
          />
        </div>
        <p className="mt-2 line-clamp-2 text-center text-sm font-bold text-white">{name}</p>
        <p className="text-xl font-black tabular-nums text-white">{pct}%</p>
        <p className="text-[11px] tabular-nums text-slate-400">{votes.toLocaleString()} votes</p>
        <div className="mt-1 h-1.5 w-full max-w-[110px] overflow-hidden rounded-full bg-white/10">
          <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
        </div>
        <Button
          size="sm"
          disabled={disabled}
          onClick={onVote}
          className={cn(
            "mt-2 w-full max-w-[130px] font-semibold",
            voted ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white hover:bg-white/20",
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : voted ? "Your pick" : "Vote"}
        </Button>
      </div>
    </div>
  );
}
