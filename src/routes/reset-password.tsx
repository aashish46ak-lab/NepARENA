import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trophy, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — eFootball Nepal" }, { name: "description", content: "Set a new password for your eFootball Nepal account." }] }),
  component: ResetPage,
});

function ResetPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { toast.error("Passwords don't match."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      router.navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center px-4 bg-gradient-hero">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-xl font-bold">Sign in first</h1>
          <p className="mt-2 text-sm text-muted-foreground">You need an active session to reset your password. Sign in with your 6-digit code, then set a new password here.</p>
          <Button asChild className="mt-4 bg-gradient-brand text-primary-foreground"><Link to="/auth">Sign in</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-hero">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6 font-bold">
          <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center glow-brand"><Trophy className="h-5 w-5 text-primary-foreground" /></div>
          <span className="text-gradient-brand text-xl">eFootball Nepal</span>
        </Link>
        <form onSubmit={submit} className="glass rounded-2xl p-6 md:p-8 space-y-4">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm password</Label>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} />
          </div>
          <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}