import { useEffect, useState } from "react";
import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import { supabase, type OwnerInfo, type Moderator } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function OwnerModeratorsPanel() {
  return (<div className="space-y-6"><OwnerPanel /><ModeratorsPanel /></div>);
}

function OwnerPanel() {
  const [row, setRow] = useState<OwnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    supabase.from("owner_info").select("*").limit(1).maybeSingle().then(({ data }) => {
      setRow((data as OwnerInfo | null) ?? null); setLoading(false);
    });
  }, []);

  const create = async () => {
    const { data } = await supabase.from("owner_info").insert({ name: "Owner name", title: "Founder & Owner", bio: "" }).select().single();
    setRow(data as OwnerInfo);
  };
  const save = async () => {
    if (!row) return; setSaving(true);
    const { error } = await supabase.from("owner_info").update({
      name: row.name, title: row.title, bio: row.bio, photo_url: row.photo_url, email: row.email, contact: row.contact,
    }).eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Owner info saved"); qc.invalidateQueries({ queryKey: ["owner_info"] });
  };

  return (
    <AdminSection title="Ownership">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : !row ? (
        <div className="space-y-3"><EmptyState message="No owner info row yet." /><Button size="sm" onClick={create}>Create owner info</Button></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Name"><Input value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} /></Field>
            <Field label="Title"><Input value={row.title} onChange={(e) => setRow({ ...row, title: e.target.value })} /></Field>
            <Field label="Bio"><Textarea rows={4} value={row.bio} onChange={(e) => setRow({ ...row, bio: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email"><Input value={row.email ?? ""} onChange={(e) => setRow({ ...row, email: e.target.value })} /></Field>
              <Field label="Contact"><Input value={row.contact ?? ""} onChange={(e) => setRow({ ...row, contact: e.target.value })} /></Field>
            </div>
          </div>
          <div>
            <Field label="Photo"><ImageUpload value={row.photo_url} onChange={(u) => setRow({ ...row, photo_url: u })} folder="owner" aspect="square" /></Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button className="bg-gradient-brand text-primary-foreground" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </div>
        </div>
      )}
    </AdminSection>
  );
}

const emptyMod: Partial<Moderator> = { name: "", role_title: "Moderator", bio: "", photo_url: null, sort_order: 0 };
function ModeratorsPanel() {
  const { rows, loading, create, update, remove } = useCrud<Moderator>("moderators", { order: [{ column: "sort_order", ascending: true }] });
  return (
    <AdminSection title="Moderators"
      action={<RowEditor triggerVariant="create" triggerLabel="Add moderator" title="Add moderator" initial={emptyMod as Moderator} onSave={(v) => create(v)}>
        {({ values, set }) => <F values={values} set={set} />}
      </RowEditor>}>
      {loading ? "Loading…" : rows.length === 0 ? <EmptyState message="No moderators yet." /> :
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              {m.photo_url ? <img src={m.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gradient-brand" />}
              <div className="flex-1"><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.role_title}</div></div>
              <RowEditor title="Edit moderator" initial={m} onSave={(v) => update(m.id, v)} onDelete={() => remove(m.id)}>
                {({ values, set }) => <F values={values} set={set} />}
              </RowEditor>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}
function F({ values, set }: { values: Moderator; set: (p: Partial<Moderator>) => void }) {
  return (<>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name"><Input value={values.name ?? ""} onChange={(e) => set({ name: e.target.value })} /></Field>
      <Field label="Role title"><Input value={values.role_title ?? ""} onChange={(e) => set({ role_title: e.target.value })} /></Field>
    </div>
    <Field label="Bio"><Textarea rows={3} value={values.bio ?? ""} onChange={(e) => set({ bio: e.target.value })} /></Field>
    <Field label="Photo"><ImageUpload value={values.photo_url} onChange={(u) => set({ photo_url: u })} folder="moderators" aspect="square" /></Field>
    <Field label="Sort order"><Input type="number" value={values.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></Field>
  </>);
}