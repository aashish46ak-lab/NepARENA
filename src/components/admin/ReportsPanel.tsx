import { useEffect, useMemo, useState } from "react";
import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { supabase } from "@/lib/supabase";
import type { Report, ReportStatus } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Flag, Eye, Trash2, User, Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

function statusBadge(s: ReportStatus) {
  const map: Record<ReportStatus, string> = {
    pending: "bg-amber-500/20 text-amber-300",
    in_review: "bg-blue-500/20 text-blue-300",
    resolved: "bg-emerald-500/20 text-emerald-300",
    dismissed: "bg-slate-500/20 text-slate-300",
  };
  return <Badge className={cn("capitalize", map[s])}>{s.replace("_", " ")}</Badge>;
}

/**
 * The DB column `screenshot_url` is plain `text`, but the report form stores
 * multiple screenshots by JSON.stringify-ing an array into it (see
 * tournaments.$id.tsx). This parses that back into a real string[] the same
 * way the public page does, so admin sees the same photos correctly.
 */
function screenshotList(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string") : [raw];
  } catch {
    return [raw];
  }
}

export function ReportsPanel() {
  const { rows, loading, update, remove } = useCrud<Report>("reports");
  const [filter, setFilter] = useState<ReportStatus | "all">("all");
  const [tournamentFilter, setTournamentFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<Report | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [tournaments, setTournaments] = useState<{ id: string; name: string }[]>([]);
  const [reporterNames, setReporterNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("tournaments").select("id, name").order("name");
      setTournaments(data ?? []);
    })();
  }, []);

  useEffect(() => {
    const ids = [...new Set(rows.map((r) => r.reporter_id).filter(Boolean))] as string[];
    if (ids.length === 0) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", ids);
      const map = new Map<string, string>();
      for (const p of data ?? []) {
        map.set(p.id, p.full_name || p.username || "Unknown user");
      }
      setReporterNames(map);
    })();
  }, [rows]);

  const tournamentName = (id: string | null | undefined) =>
    tournaments.find((t) => t.id === id)?.name ?? "Unknown tournament";

  const list = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (tournamentFilter !== "all" && r.tournament_id !== tournamentFilter) return false;
      return true;
    });
  }, [rows, filter, tournamentFilter]);

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  const viewingScreenshots = screenshotList(viewing?.screenshot_url);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextPhoto = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % viewingScreenshots.length));
  const prevPhoto = () =>
    setLightboxIndex((i) =>
      i === null ? null : (i - 1 + viewingScreenshots.length) % viewingScreenshots.length,
    );

  let touchStartX = 0;
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) nextPhoto();
    else prevPhoto();
  };

  return (
    <AdminSection
      title="Reports"
      description={`${pendingCount} report${pendingCount === 1 ? "" : "s"} waiting for review.`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All tournaments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tournaments</SelectItem>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "outline"}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="text-muted-foreground">Loading reports…</div>
      ) : list.length === 0 ? (
        <EmptyState message="No reports in this view." />
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const shots = screenshotList(r.screenshot_url);
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-4"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-500/15">
                  <Flag className="h-4 w-4 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.reason}</span>
                    {statusBadge(r.status)}
                    <Badge variant="outline" className="capitalize">{r.type}</Badge>
                    {shots.length > 0 && (
                      <Badge variant="outline">
                        {shots.length} photo{shots.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tournamentName(r.tournament_id)} · Reported by {(r.reporter_id ? reporterNames.get(r.reporter_id) : null) ?? "…"}
                    {r.player_name ? ` · Player: ${r.player_name}` : ""} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                  </Button>
                  <Select
                    value={r.status}
                    onValueChange={(v) => update(r.id, { status: v as ReportStatus })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In review</SelectItem>
                      <SelectItem value="resolved">Resolve</SelectItem>
                      <SelectItem value="dismissed">Dismiss</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete this report?")) remove(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) { setViewing(null); closeLightbox(); } }}>
        <DialogContent className="glass max-w-lg">
          <DialogHeader>
            <DialogTitle>Report details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {statusBadge(viewing.status)}
                <Badge variant="outline" className="capitalize">{viewing.type}</Badge>
              </div>
              <p className="text-lg font-semibold">{viewing.reason}</p>
              {viewing.description && (
                <p className="whitespace-pre-line text-muted-foreground">{viewing.description}</p>
              )}
              <div className="space-y-1.5 rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5" /> Tournament: {tournamentName(viewing.tournament_id)}
                </p>
                <p className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Reported by: {(viewing.reporter_id ? reporterNames.get(viewing.reporter_id) : null) ?? "Unknown user"}
                </p>
                {viewing.player_name && (
                  <p className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Reported player: {viewing.player_name}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> {new Date(viewing.created_at).toLocaleString()}
                </p>
              </div>

              {viewingScreenshots.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Screenshots</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingScreenshots.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openLightbox(i)}
                        className="overflow-hidden rounded-lg border border-border/60"
                      >
                        <img src={url} alt={`Screenshot ${i + 1}`} className="h-20 w-20 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { update(viewing.id, { status: "dismissed" }); setViewing(null); }}>
                  Dismiss
                </Button>
                <Button className="bg-gradient-brand" onClick={() => { update(viewing.id, { status: "resolved" }); setViewing(null); }}>
                  Mark resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {lightboxIndex !== null && viewingScreenshots.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {viewingScreenshots.length > 1 && (
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-2 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <img
            src={viewingScreenshots[lightboxIndex]}
            alt={`Screenshot ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-full rounded-lg object-contain select-none"
          />

          {viewingScreenshots.length > 1 && (
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-2 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {viewingScreenshots.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {lightboxIndex + 1} / {viewingScreenshots.length}
            </div>
          )}
        </div>
      )}
    </AdminSection>
  );
}
