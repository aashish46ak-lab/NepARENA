import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import type { CommunityLink } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS, PlatformIcon, getPlatform } from "@/lib/platforms";

const empty: Partial<CommunityLink> = { platform: "facebook", label: "", url: "", icon: "facebook", sort_order: 0 };

export function CommunityLinksPanel() {
  const { rows, loading, create, update, remove } = useCrud<CommunityLink>("community_links", { order: [{ column: "sort_order", ascending: true }] });
  return (
    <AdminSection title="Community links" description="Discord, Facebook, WhatsApp, YouTube — anywhere the community lives."
      action={<RowEditor triggerVariant="create" triggerLabel="Add link" title="Add community link" initial={empty as CommunityLink} onSave={(v) => create(v)}>
        {({ values, set }) => <F values={values} set={set} />}
      </RowEditor>}>
      {loading ? "Loading…" : rows.length === 0 ? <EmptyState message="No links yet." /> :
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-white/5 grid place-items-center"><PlatformIcon platform={l.platform} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.label} <span className="text-xs text-muted-foreground">· {getPlatform(l.platform).label}</span></div>
                <div className="text-xs text-brand-glow truncate">{l.url}</div>
              </div>
              <RowEditor title="Edit link" initial={l} onSave={(v) => update(l.id, v)} onDelete={() => remove(l.id)}>
                {({ values, set }) => <F values={values} set={set} />}
              </RowEditor>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}
function F({ values, set }: { values: CommunityLink; set: (p: Partial<CommunityLink>) => void }) {
  return (<>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Platform">
        <Select value={getPlatform(values.platform).value} onValueChange={(v) => set({ platform: v, icon: v })}>
          <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                <span className="flex items-center gap-2"><PlatformIcon platform={p.value} className={`h-4 w-4 ${p.color}`} /> {p.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Label"><Input value={values.label ?? ""} onChange={(e) => set({ label: e.target.value })} placeholder="Join our Discord" /></Field>
    </div>
    <Field label="URL"><Input value={values.url ?? ""} onChange={(e) => set({ url: e.target.value })} placeholder="https://" /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Sort order"><Input type="number" value={values.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></Field>
      <div className="flex items-end text-xs text-muted-foreground">The official icon is applied automatically from the platform.</div>
    </div>
  </>);
}