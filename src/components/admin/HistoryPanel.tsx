import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import type { TournamentHistoryEntry } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ImageUpload";

const empty: Partial<TournamentHistoryEntry> = { tournament_name: "", winner: "", runner_up: "", year: new Date().getFullYear(), banner_url: null, prize_pool: "", sort_order: 0 };

export function HistoryPanel() {
  const { rows, loading, create, update, remove } = useCrud<TournamentHistoryEntry>("tournament_history", { order: [{ column: "year", ascending: false }, { column: "sort_order", ascending: true }] });
  return (
    <AdminSection title="Tournament history"
      action={<RowEditor triggerVariant="create" triggerLabel="Add entry" title="Add history entry" initial={empty as TournamentHistoryEntry} onSave={(v) => create(v)}>
        {({ values, set }) => <F values={values} set={set} />}
      </RowEditor>}>
      {loading ? "Loading…" : rows.length === 0 ? <EmptyState message="No history yet." /> :
        <div className="grid gap-3">
          {rows.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <div className="text-xs w-14 text-brand-glow font-semibold">{h.year}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{h.tournament_name}</div>
                <div className="text-xs text-muted-foreground truncate">🏆 {h.winner}{h.runner_up ? ` · 🥈 ${h.runner_up}` : ""}</div>
              </div>
              <RowEditor title="Edit entry" initial={h} onSave={(v) => update(h.id, v)} onDelete={() => remove(h.id)}>
                {({ values, set }) => <F values={values} set={set} />}
              </RowEditor>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}
function F({ values, set }: { values: TournamentHistoryEntry; set: (p: Partial<TournamentHistoryEntry>) => void }) {
  return (<>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tournament name"><Input value={values.tournament_name ?? ""} onChange={(e) => set({ tournament_name: e.target.value })} /></Field>
      <Field label="Year"><Input type="number" value={values.year ?? ""} onChange={(e) => set({ year: Number(e.target.value) })} /></Field>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Winner"><Input value={values.winner ?? ""} onChange={(e) => set({ winner: e.target.value })} /></Field>
      <Field label="Runner-up"><Input value={values.runner_up ?? ""} onChange={(e) => set({ runner_up: e.target.value })} /></Field>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Prize pool"><Input value={values.prize_pool ?? ""} onChange={(e) => set({ prize_pool: e.target.value })} /></Field>
      <Field label="Sort order"><Input type="number" value={values.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></Field>
    </div>
    <Field label="Banner"><ImageUpload value={values.banner_url} onChange={(u) => set({ banner_url: u })} folder="history" aspect="wide" /></Field>
  </>);
}