import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trophy, Loader2, Mail, ArrowRight } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — eFootball Nepal" }, { name: "description", content: "Sign in or create your eFootball Nepal account with a secure 6-digit code." }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/" });
  }, [user, loading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) { toast.error("Enter a valid email address."); return; }
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      sessionStorage.setItem("efn-otp-email", parsed.data);
      sessionStorage.setItem("efn-otp-remember", remember ? "1" : "0");
      toast.success("6-digit code sent to your inbox");
      router.navigate({ to: "/auth/verify" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-hero">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6 font-bold">
          <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center glow-brand">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-gradient-brand text-xl">eFootball Nepal</span>
        </Link>
        <div className="glass rounded-2xl p-6 md:p-8">
          <h1 className="text-2xl font-bold text-center">Sign in or create account</h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            We'll email you a 6-digit code — no passwords, no verification links.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" required autoFocus className="pl-9" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me on this device</Label>
            </div>
            <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send 6-digit code <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>
          </form>
          <p className="mt-6 text-xs text-center text-muted-foreground">
            By continuing you agree to the community rules of eFootball Nepal.
          </p>
        </div>
      </div>
    </div>
  );
}