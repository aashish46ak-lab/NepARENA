import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail, Lock, User, Loader2, Eye, EyeOff, LogIn, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth/")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { email?: string } => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — NepARENA" },
      { name: "description", content: "Sign in or create your NepARENA account to join tournaments and communities." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup";
const emailSchema = z.string().trim().email().max(255);

function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    void (async () => {
      const { data: memberships } = await supabase
        .from("organizer_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (memberships && memberships.length > 0) {
        router.navigate({ to: "/dashboard", replace: true });
      } else {
        router.navigate({ to: "/", replace: true });
      }
    })();
  }, [loading, user, router]);

  useEffect(() => {
    if (search.email) setEmail(search.email);
  }, [search.email]);

  const login = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { toast.error("Please enter a valid email."); return; }
    if (!password) { toast.error("Enter your password."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data, password });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      return;
    }
    toast.success("Welcome back!");
  };

  const signup = async () => {
    if (!name.trim()) { toast.error("Enter your name."); return; }
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { toast.error("Please enter a valid email."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data,
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    try {
      sessionStorage.setItem("neparena-email", parsed.data);
      sessionStorage.setItem("neparena-otp-type", "signup");
      sessionStorage.setItem("neparena-fullname", name.trim());
    } catch {
      /* private mode */
    }
    toast.success("Check your email for the 6-digit code.");
    void router.navigate({
      to: "/auth/verify",
      search: { email: parsed.data, type: "signup" },
    });
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-1 text-sm text-neutral-400">NepARENA — multi-organizer esports</p>
      </div>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label>Name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input className="pl-10" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input className="pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input className="pl-10 pr-10" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" onClick={() => setShowPw((v) => !v)}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button className="w-full" disabled={busy} onClick={() => void (mode === "login" ? login() : signup())}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <><LogIn className="mr-2 h-4 w-4" /> Sign in</> : <><UserPlus className="mr-2 h-4 w-4" /> Sign up</>}
        </Button>
        <button type="button" className="w-full text-center text-sm text-sky-400 hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">
        <Link to="/" className="hover:text-white">← Back home</Link>
      </p>
    </div>
  );
}
