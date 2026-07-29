import { useEffect, useState } from "react";
import { AdminSection } from "./AdminUI";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type Profile } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Field } from "./RowEditor";

export function ProfilePanel() {
  const { user, refreshProfile } = useAuth();
  const [row, setRow] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setRow((data as Profile) ?? null));
  }, [user]);

  if (!row) return <div className="text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: row.username, full_name: row.full_name, avatar_url: row.avatar_url,
      favourite_club: row.favourite_club, bio: row.bio,
    }).eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated"); refreshProfile();
  };

  return (
    <AdminSection title="My profile">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Username"><Input value={row.username ?? ""} onChange={(e) => setRow({ ...row, username: e.target.value })} /></Field>
          <Field label="Full name"><Input value={row.full_name ?? ""} onChange={(e) => setRow({ ...row, full_name: e.target.value })} /></Field>
          <Field label="Favourite club"><Input value={row.favourite_club ?? ""} onChange={(e) => setRow({ ...row, favourite_club: e.target.value })} /></Field>
          <Field label="Bio"><Textarea rows={4} value={row.bio ?? ""} onChange={(e) => setRow({ ...row, bio: e.target.value })} /></Field>
        </div>
        <div>
          <Field label="Avatar"><ImageUpload value={row.avatar_url} onChange={(u) => setRow({ ...row, avatar_url: u })} folder={`avatars/${row.id}`} aspect="square" /></Field>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button className="bg-gradient-brand text-primary-foreground" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </div>
      </div>
    </AdminSection>
  );
}