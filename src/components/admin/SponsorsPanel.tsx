import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import type { Sponsor } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";

const empty: Partial<Sponsor> = { name: "", logo_url: null, website_url: "", tier: "partner", sort_order: 0 };

export function SponsorsPanel() {
  const { rows, loading, create, update, remove } = useCrud<Sponsor>("sponsors", { order: [{ column: "sort_order", ascending: true }] });
  return (
    <AdminSection title="Sponsors"
      action={<RowEditor triggerVariant="create" triggerLabel="Add sponsor" title="Add sponsor" initial={empty as Sponsor} onSave={(v) => create(v)}>
        {({ values, set }) => <F values={values} set={set} />}
      </RowEditor>}>
      {loading ? "Loading…" : rows.length === 0 ? <EmptyState message="No sponsors yet." /> :
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              {s.logo_url && <img src={s.logo_url} alt="" className="h-10 w-10 rounded object-contain bg-white/5" />}
              <div className="flex-1"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground capitalize">{s.tier}</div></div>
              <RowEditor title="Edit sponsor" initial={s} onSave={(v) => update(s.id, v)} onDelete={() => remove(s.id)}>
                {({ values, set }) => <F values={values} set={set} />}
              </RowEditor>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}
function F({ values, set }: { values: Sponsor; set: (p: Partial<Sponsor>) => void }) {
  return (<>
    <Field label="Name"><Input value={values.name ?? ""} onChange={(e) => set({ name: e.target.value })} /></Field>
    <Field label="Logo"><ImageUpload value={values.logo_url} onChange={(u) => set({ logo_url: u })} folder="sponsors" aspect="square" /></Field>
    <Field label="Website URL"><Input value={values.website_url ?? ""} onChange={(e) => set({ website_url: e.target.value })} placeholder="https://" /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tier">
        <Select value={values.tier} onValueChange={(v) => set({ tier: v as Sponsor["tier"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Sort order"><Input type="number" value={values.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></Field>
    </div>
  </>);
}