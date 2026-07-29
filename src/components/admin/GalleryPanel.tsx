import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";
import type { GalleryItem } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ImageUpload";

const empty: Partial<GalleryItem> = { image_url: "", caption: "", sort_order: 0 };

export function GalleryPanel() {
  const { rows, loading, create, update, remove } = useCrud<GalleryItem>("gallery", { order: [{ column: "sort_order", ascending: true }, { column: "created_at", ascending: false }] });
  return (
    <AdminSection title="Gallery"
      action={<RowEditor triggerVariant="create" triggerLabel="Add photo" title="Add photo" initial={empty as GalleryItem}
        onSave={async (v) => { if (!v.image_url) return; await create(v); }}>
        {({ values, set }) => <F values={values} set={set} />}
      </RowEditor>}>
      {loading ? "Loading…" : rows.length === 0 ? <EmptyState message="No photos yet." /> :
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {rows.map((g) => (
            <div key={g.id} className="relative rounded-lg overflow-hidden group aspect-square">
              <img src={g.image_url} alt={g.caption ?? ""} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                <RowEditor title="Edit photo" initial={g} onSave={(v) => update(g.id, v)} onDelete={() => remove(g.id)}>
                  {({ values, set }) => <F values={values} set={set} />}
                </RowEditor>
              </div>
            </div>
          ))}
        </div>}
    </AdminSection>
  );
}
function F({ values, set }: { values: GalleryItem; set: (p: Partial<GalleryItem>) => void }) {
  return (<>
    <Field label="Image"><ImageUpload value={values.image_url || null} onChange={(u) => set({ image_url: u ?? "" })} folder="gallery" aspect="square" /></Field>
    <Field label="Caption"><Input value={values.caption ?? ""} onChange={(e) => set({ caption: e.target.value })} /></Field>
    <Field label="Sort order"><Input type="number" value={values.sort_order ?? 0} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></Field>
  </>);
}