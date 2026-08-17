import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AdminSection, EmptyState } from "./AdminUI";
import { RowEditor, Field } from "./RowEditor";
import type { CommunityLink } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS, PlatformIcon, getPlatform } from "@/lib/platforms";

const empty: Partial<CommunityLink> = { platform: "facebook", label: "", url: "", icon: "facebook", sort_order: 0 };

type LinkRow = CommunityLink & { organizer_id?: string | null };

function useOrgCommunityLinks(organizerId?: string | null) {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("community_links").select("*").order("sort_order", { ascending: true });
    if (organizerId) q = q.eq("organizer_id", organizerId);
    else q = q.is("organizer_id", null);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as LinkRow[]);
    setLoading(false);
  }, [organizerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async (values: Partial<CommunityLink>) => {
    if (!organizerId) {
      toast.error("Select an organizer workspace first");
      return null;
    }
    const payload = { ...values, organizer_id: organizerId };
    const { data, error } = await supabase.from("community_links").insert(payload as never).select().single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    toast.success("Created");
    void qc.invalidateQueries({ queryKey: ["org_community_links"] });
    await reload();
    return data as CommunityLink;
  };
  const update = async (id: string, values: Partial<CommunityLink>) => {
    const { error } = await supabase.from("community_links").update(values as never).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Saved");
    void qc.invalidateQueries({ queryKey: ["org_community_links"] });
    await reload();
    return true;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("community_links").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Deleted");
    void qc.invalidateQueries({ queryKey: ["org_community_links"] });
    await reload();
    return true;
  };
  return { rows, loading, create, update, remove };
}

export function CommunityLinksPanel({ organizerId }: { organizerId?: string | null }) {
  const { rows, loading, create, update, remove } = useOrgCommunityLinks(organizerId);
  return (
    <AdminSection
      title="Community links"
      description="Links for THIS organizer only. They appear on the public organizer page after you add them."
      action={
        <RowEditor
          triggerVariant="create"
          triggerLabel="Add link"
          title="Add community link"
          initial={empty as CommunityLink}
          onSave={(v) => create(v)}
        >
          {({ values, set }) => <F values={values} set={set} />}
        </RowEditor>
      }
    >
      {!organizerId && (
        <p className="mb-3 text-sm text-amber-300/90">Select an organizer workspace to manage its links.</p>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No links yet" description="Add Discord, Facebook, WhatsApp, etc. for this organizer." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5">
                <PlatformIcon platform={l.platform} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {l.label}{" "}
                  <span className="text-xs text-muted-foreground">· {getPlatform(l.platform).label}</span>
                </div>
                <div className="truncate text-xs text-brand-glow">{l.url}</div>
              </div>
              <RowEditor title="Edit link" initial={l} onSave={(v) => update(l.id, v)} onDelete={() => remove(l.id)}>
                {({ values, set }) => <F values={values} set={set} />}
              </RowEditor>
            </div>
          ))}
        </div>
      )}
    </AdminSection>
  );
}

function F({ values, set }: { values: CommunityLink; set: (p: Partial<CommunityLink>) => void }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Platform">
          <Select value={getPlatform(values.platform).value} onValueChange={(v) => set({ platform: v, icon: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform={p.value} className={`h-4 w-4 ${p.color}`} /> {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Label">
          <Input value={values.label ?? ""} onChange={(e) => set({ label: e.target.value })} placeholder="Join our Discord" />
        </Field>
      </div>
      <Field label="URL">
        <Input value={values.url ?? ""} onChange={(e) => set({ url: e.target.value })} placeholder="https://" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sort order">
          <Input type="number" value={values.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} />
        </Field>
        <div className="flex items-end text-xs text-muted-foreground">Official icon applies from the platform.</div>
      </div>
    </>
  );
}
