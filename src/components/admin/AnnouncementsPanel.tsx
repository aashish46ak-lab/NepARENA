import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import type { Announcement } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { Pin } from "lucide-react";

const empty: Partial<Announcement> = { title: "", body: "", image_url: null, is_pinned: false };

export function AnnouncementsPanel() {
  const { rows, loading, create, update, remove } = useCrud<Announcement>("announcements", { order: [{ column: "is_pinned", ascending: false }, { column: "created_at", ascending: false }], invalidate: ["announcements", "announcement_latest"] });
  return (
    <AdminSection title="Announcements"
      action={<RowEditor triggerVariant="create" triggerLabel="New announcement" title="New announcement" initial={empty as Announcement} onSave={(v) => create(v)}>
        {({ values, set }) => <AnnFields values={values} set={set} />}
      </RowEditor>}>
      {loading ? "Loading…" : rows.length === 0 ? <EmptyState message="No announcements yet." /> :
        <div className="grid gap-3">
          {rows.map((a) => (
            <div key={a.id} className="flex items-start gap-4 rounded-lg border border-border/60 p-3">
              {a.image_url && <img src={a.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">{a.is_pinned && <Pin className="h-3.5 w-3.5 text-brand-glow" />} {a.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{a.body}</div>
              </div>
              <RowEditor title="Edit announcement" initial={a} onSave={(v) => update(a.id, v)} onDelete={() => remove(a.id)}>
                {({ values, set }) => <AnnFields values={values} set={set} />}
              </RowEditor>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}

function AnnFields({ values, set }: { values: Announcement; set: (p: Partial<Announcement>) => void }) {
  return (<>
    <Field label="Title"><Input value={values.title ?? ""} onChange={(e) => set({ title: e.target.value })} /></Field>
    <Field label="Body"><Textarea rows={4} value={values.body ?? ""} onChange={(e) => set({ body: e.target.value })} /></Field>
    <Field label="Image (optional)"><ImageUpload value={values.image_url} onChange={(u) => set({ image_url: u })} folder="announcements" /></Field>
    <label className="flex items-center gap-2 text-sm"><Switch checked={values.is_pinned} onCheckedChange={(v) => set({ is_pinned: v })} /> Pin to top</label>
  </>);
}