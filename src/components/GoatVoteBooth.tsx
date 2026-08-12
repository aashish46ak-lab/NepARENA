import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { MESSI_PHOTO, RONALDO_PHOTO } from "@/lib/player-photos";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Download, Loader2, Share2 } from "lucide-react";
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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function GoatVoteBooth() {
  const { user } = useAuth();
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

  const requireLogin = () => {
    toast.message("Sign in to vote", {
      description: "Anyone can view results. Voting needs a NepARENA account.",
      action: {
        label: "Sign in",
        onClick: () => {
          window.location.href = "/auth/";
        },
      },
    });
  };

  const vote = async (option: "messi" | "ronaldo") => {
    if (!user) {
      requireLogin();
      return;
    }
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
        toast.success("Poll link copied");
      }
    } catch {
      /* cancel */
    }
  };

  const downloadResults = async () => {
    try {
      const W = 1080;
      const H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#020617");
      bg.addColorStop(0.5, "#0c1a3a");
      bg.addColorStop(1, "#020617");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const logo = await loadImage("/neparena-logo.png");
      if (logo) ctx.drawImage(logo, W / 2 - 48, 40, 96, 96);

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VOTE YOUR GOAT", W / 2, 180);
      ctx.fillStyle = "rgba(148,163,184,0.95)";
      ctx.font = "26px system-ui, sans-serif";
      ctx.fillText("Messi vs Ronaldo · NepARENA", W / 2, 220);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 36px system-ui";
      ctx.fillText(`Total votes: ${total.toLocaleString()}`, W / 2, 280);

      const messiImg = await loadImage(MESSI_PHOTO);
      const ronaldoImg = await loadImage(RONALDO_PHOTO);

      // Messi card
      ctx.fillStyle = "rgba(14,165,233,0.15)";
      roundRect(ctx, 60, 320, 440, 820, 24);
      ctx.fill();
      if (messiImg) {
        ctx.save();
        roundRect(ctx, 90, 350, 380, 480, 16);
        ctx.clip();
        ctx.drawImage(messiImg, 90, 350, 380, 480);
        ctx.restore();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 40px system-ui";
      ctx.fillText("Messi", 280, 880);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 64px system-ui";
      ctx.fillText(`${messiPct}%`, 280, 960);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "28px system-ui";
      ctx.fillText(`${counts.messi.toLocaleString()} votes`, 280, 1010);

      // Ronaldo card
      ctx.fillStyle = "rgba(244,63,94,0.15)";
      roundRect(ctx, 580, 320, 440, 820, 24);
      ctx.fill();
      if (ronaldoImg) {
        ctx.save();
        roundRect(ctx, 610, 350, 380, 480, 16);
        ctx.clip();
        ctx.drawImage(ronaldoImg, 610, 350, 380, 480);
        ctx.restore();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 40px system-ui";
      ctx.fillText("Ronaldo", 800, 880);
      ctx.fillStyle = "#fb7185";
      ctx.font = "bold 64px system-ui";
      ctx.fillText(`${ronaldoPct}%`, 800, 960);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "28px system-ui";
      ctx.fillText(`${counts.ronaldo.toLocaleString()} votes`, 800, 1010);

      ctx.fillStyle = "rgba(148,163,184,0.85)";
      ctx.font = "22px system-ui";
      ctx.fillText("neparena.xyz/vote/goat", W / 2, H - 40);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `neparena-goat-results-${Date.now()}.png`;
      a.click();
      toast.success("Results downloaded");
    } catch {
      toast.error("Could not export results");
    }
  };

  return (
    <div
      id="goat-vote"
      className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 via-[#0b1220] to-black"
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/5 px-4 py-4 sm:px-6">
        <div className="text-left sm:flex-1 sm:text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400/90">
            Community poll
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
            VOTE YOUR GOAT
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Messi vs Ronaldo · vote requires login
          </p>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Total votes:{" "}
            <span className="tabular-nums text-white">
              {isLoading ? "…" : total.toLocaleString()}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button size="sm" variant="outline" className="border-white/15" onClick={() => void sharePoll()}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>
          <Button size="sm" variant="outline" className="border-white/15" onClick={() => void downloadResults()}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Result
          </Button>
        </div>
      </div>

      {!user && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
          View free ·{" "}
          <Link to="/auth/" className="font-semibold underline">
            Sign in to vote
          </Link>
        </div>
      )}

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
