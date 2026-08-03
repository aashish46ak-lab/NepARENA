import { useState } from "react";
import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import type { Report, ReportStatus } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Flag, Eye, Trash2, User, Calendar, Link2 } from "lucide-react";
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

export function ReportsPanel() {
  const { rows, loading, update, remove } = useCrud<Report>("reports");
  const [filter, setFilter] = useState<ReportStatus | "all">("all");
  const [viewing, setViewing] = useState<Report | null>(null);

  const list = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <AdminSection
      title="Reports"
      description={`${pendingCount} report${pendingCount === 1 ? "" : "s"} waiting for review.`}
      action={
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
      }
    >
      {loading ? (
        <div className="text-muted-foreground">Loading reports…</div>
      ) : list.length === 0 ? (
        <EmptyState message="No reports in this view." />
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
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
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {r.player_name ? `Player: ${r.player_name} · ` : ""}
                  {new Date(r.created_at).toLocaleString()}
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
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
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
                {viewing.player_name && (
                  <p className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Reported player: {viewing.player_name}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> {new Date(viewing.created_at).toLocaleString()}
                </p>
                {viewing.screenshot_url && (
                  <a
                    href={viewing.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-brand-glow hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" /> View screenshot evidence
                  </a>
                )}
              </div>
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
    </AdminSection>
  );
}