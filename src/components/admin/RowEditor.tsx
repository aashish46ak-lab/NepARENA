import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

interface Props<T> {
  title: string;
  initial: T;
  onSave: (values: T) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
  triggerLabel?: string;
  triggerVariant?: "create" | "edit";
  children: (state: { values: T; set: (p: Partial<T>) => void }) => ReactNode;
}

export function RowEditor<T extends object>({ title, initial, onSave, onDelete, triggerLabel, triggerVariant = "edit", children }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<T>) => setValues((v) => ({ ...v, ...p }));
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setValues(initial); }}>
      <DialogTrigger asChild>
        {triggerVariant === "create" ? (
          <Button size="sm" className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> {triggerLabel ?? "New"}</Button>
        ) : (
          <Button size="sm" variant="outline" className="border-brand/30"><Pencil className="h-4 w-4" /></Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">{children({ values, set })}</div>
        <DialogFooter className="mt-4 gap-2 sm:justify-between">
          <div>
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={async () => { if (!confirm("Delete this item?")) return; await onDelete(); setOpen(false); }}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-brand text-primary-foreground" disabled={saving}
              onClick={async () => { setSaving(true); try { await onSave(values); setOpen(false); } finally { setSaving(false); } }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label}</label>{children}</div>;
}