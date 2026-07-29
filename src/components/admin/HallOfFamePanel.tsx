import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import type { HallOfFameEntry } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ImageUpload";

const empty: Partial<HallOfFameEntry> = { player_name: "", achievement: "", tournament: "", photo_url: null, year: new Date().getFullYear(), sort_order: 0 };

export function HallOfFamePanel() {
  const { rows, loading, create, update, remove } = useCrud<HallOfFameEntry>("hall_of_fame", { order: [{ column: "sort_order", ascending: true }] });
  return (
    <AdminSection title="Hall of Fame"
      action={<RowEditor triggerVariant="create" triggerLabel="Add champion" title="Add champion" initial={empty as HallOfFameEntry} onSave={(v) => create(v)}>
        {({ values, set }) => <HFields values={values} set={set} />}
      </RowEditor>}>
      {loading ? "Loading…" : rows.length === 0 ? <EmptyState message="No champions yet." /> :
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              {h.photo_url ? <img src={h.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-gradient-brand" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{h.player_name}</div>
                <div className="text-xs text-muted-foreground truncate">{h.achievement}{h.year ? ` · ${h.year}` : ""}</div>
              </div>
              <RowEditor title="Edit champion" initial={h} onSave={(v) => update(h.id, v)} onDelete={() => remove(h.id)}>
                {({ values, set }) => <HFields values={values} set={set} />}
              </RowEditor>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}
function HFields({ values, set }: { values: HallOfFameEntry; set: (p: Partial<HallOfFameEntry>) => void }) {
  return (<>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Player name"><Input value={values.player_name ?? ""} onChange={(e) => set({ player_name: e.target.value })} /></Field>
      <Field label="Year"><Input type="number" value={values.year ?? ""} onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : null })} /></Field>
    </div>
    <Field label="Achievement"><Input value={values.achievement ?? ""} onChange={(e) => set({ achievement: e.target.value })} placeholder="Season 3 Champion" /></Field>
    <Field label="Tournament"><Input value={values.tournament ?? ""} onChange={(e) => set({ tournament: e.target.value })} /></Field>
    <Field label="Photo"><ImageUpload value={values.photo_url} onChange={(u) => set({ photo_url: u })} folder="hall-of-fame" aspect="square" /></Field>
    <Field label="Sort order"><Input type="number" value={values.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></Field>
  </>);
}