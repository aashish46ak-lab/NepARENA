import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import type { Tournament } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { Badge } from "@/components/ui/badge";

const empty: Partial<Tournament> = {
  slug: "", name: "", description: "", banner_url: null, status: "upcoming",
  registration_open: false, prize_pool: "", participants_count: 0, starts_at: null, ends_at: null,
};

export function TournamentsPanel() {
  const { rows, loading, create, update, remove } = useCrud<Tournament>("tournaments");
  return (
    <AdminSection title="Tournaments" description="Create and manage tournaments shown across the site."
      action={<RowEditor triggerVariant="create" triggerLabel="New tournament" title="New tournament" initial={empty as Tournament}
        onSave={(v) => create({ ...v, slug: v.slug || slugify(v.name) })}>
        {({ values, set }) => <TournamentFields values={values} set={set} />}
      </RowEditor>}>
      {loading ? <div className="text-muted-foreground">Loading…</div>
        : rows.length === 0 ? <EmptyState message="No tournaments yet." />
        : <div className="grid gap-3">
            {rows.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-lg border border-border/60 p-3">
                <div className="h-14 w-24 rounded overflow-hidden bg-secondary shrink-0">
                  {t.banner_url && <img src={t.banner_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-2 flex-wrap mt-1">
                    <Badge variant="outline" className="capitalize">{t.status.replace("_", " ")}</Badge>
                    {t.registration_open && <Badge className="bg-emerald-500/20 text-emerald-300">Registration open</Badge>}
                    {t.prize_pool && <span>{t.prize_pool}</span>}
                  </div>
                </div>
                <RowEditor title="Edit tournament" initial={t}
                  onSave={(v) => update(t.id, v)} onDelete={() => remove(t.id)}>
                  {({ values, set }) => <TournamentFields values={values} set={set} />}
                </RowEditor>
              </div>
            ))}
          </div>}
    </AdminSection>
  );
}

function TournamentFields({ values, set }: { values: Tournament; set: (p: Partial<Tournament>) => void }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={values.name ?? ""} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Slug (URL)"><Input value={values.slug ?? ""} onChange={(e) => set({ slug: e.target.value })} placeholder="auto from name" /></Field>
      </div>
      <Field label="Description"><Textarea rows={3} value={values.description ?? ""} onChange={(e) => set({ description: e.target.value })} /></Field>
      <Field label="Banner image"><ImageUpload value={values.banner_url} onChange={(u) => set({ banner_url: u })} folder="tournaments" aspect="wide" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status">
          <Select value={values.status} onValueChange={(v) => set({ status: v as Tournament["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="registration_open">Registration open</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Prize pool"><Input value={values.prize_pool ?? ""} onChange={(e) => set({ prize_pool: e.target.value })} placeholder="Rs. 50,000" /></Field>
        <Field label="Participants"><Input type="number" value={values.participants_count ?? 0} onChange={(e) => set({ participants_count: Number(e.target.value) })} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts at"><Input type="datetime-local" value={values.starts_at ? values.starts_at.slice(0,16) : ""} onChange={(e) => set({ starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
        <Field label="Ends at"><Input type="datetime-local" value={values.ends_at ? values.ends_at.slice(0,16) : ""} onChange={(e) => set({ ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={values.registration_open} onCheckedChange={(v) => set({ registration_open: v })} /> Registration open</label>
    </>
  );
}

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }