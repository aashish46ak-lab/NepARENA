import { Link } from "@tanstack/react-router";
import {
  Users, UserCheck, Swords, Trophy, Shuffle, MailPlus, Calendar, Wallet,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bracketLabel } from "@/lib/brackets";
import type { Tournament } from "@/lib/supabase";
import type { TournamentData } from "./shared";

interface Props {
  tournament: Tournament;
  data: TournamentData;
  goTab: (tab: string) => void;
}

export function OverviewTab({ tournament, data, goTab }: Props) {
  const approved = data.players.filter((p) => p.status === "approved").length;
  const pending = data.players.filter((p) => p.status === "pending").length;
  const played = data.matches.filter((m) => m.played).length;
  const max = tournament.max_players ?? 0;
  const pct = max > 0 ? Math.min(100, Math.round((approved / max) * 100)) : 0;
  const fee = Number(tournament.registration_fee ?? 0);

  const stats = [
    { icon: UserCheck, label: "Approved Players", value: approved, tint: "bg-emerald-500/15 text-emerald-300" },
    { icon: Users, label: "Pending Requests", value: pending, tint: "bg-amber-500/15 text-amber-300" },
    { icon: Swords, label: "Matches Played", value: `${played} / ${data.matches.length}`, tint: "bg-brand/15 text-brand-glow" },
    { icon: Trophy, label: "Prize Pool", value: tournament.prize_pool ?? "—", tint: "bg-violet-500/15 text-violet-300" },
  ];

  return (
    <div className="space-y-5 pt-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className={`inline-flex rounded-lg p-2 ${s.tint}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Registration progress</span>
          <span className="text-muted-foreground">
            {approved}{max > 0 ? ` / ${max}` : ""} players
          </span>
        </div>
        {max > 0 ? (
          <Progress value={pct} className="h-2" />
        ) : (
          <p className="text-xs text-muted-foreground">No player limit set.</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="capitalize">
            {tournament.status.replace(/_/g, " ")}
          </Badge>
          <Badge variant="outline">{bracketLabel(tournament.bracket_type)}</Badge>
          {tournament.registration_open ? (
            <Badge className="bg-emerald-500/20 text-emerald-300">Registration open</Badge>
          ) : (
            <Badge variant="outline">Registration closed</Badge>
          )}
          {tournament.starts_at && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(tournament.starts_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Registration & revenue
          </h3>
          <Wallet className="h-4 w-4 text-brand-glow" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Entry fee</p>
            <p className="text-lg font-bold">
              {fee > 0 ? "NPR " + fee.toLocaleString() : "Free"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expected revenue</p>
            <p className="text-lg font-bold text-brand-glow">
              NPR {(fee * approved).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">{approved} approved × fee</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining slots</p>
            <p className="text-lg font-bold">
              {max > 0 ? Math.max(0, max - approved) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Potential revenue</p>
            <p className="text-lg font-bold">
              {max > 0 ? "NPR " + (fee * max).toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Quick actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-gradient-brand text-primary-foreground" onClick={() => goTab("fixtures")}>
            <Shuffle className="h-4 w-4 mr-1.5" /> Fixtures
          </Button>
          <Button size="sm" variant="secondary" onClick={() => goTab("invitations")}>
            <MailPlus className="h-4 w-4 mr-1.5" /> Invite players
          </Button>
          <Button size="sm" variant="secondary" onClick={() => goTab("results")}>
            <Swords className="h-4 w-4 mr-1.5" /> Enter results
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/tournaments/$id" params={{ id: tournament.id }}>View public page</Link>
          </Button>
        </div>
      </div>

      {tournament.description && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            About
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{tournament.description}</p>
        </div>
      )}
    </div>
  );
}