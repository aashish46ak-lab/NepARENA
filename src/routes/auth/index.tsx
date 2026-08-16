import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  User,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { email?: string } => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — NepARENA" },
      {
        name: "description",
        content:
          "Sign in or create your NepARENA account to join tournaments and communities.",
      },
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
    if (!loading && user) {
      router.navigate({ to: "/", replace: true });
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (search.email) setEmail(search.email);
  }, [search.email]);

  const login = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (!password) {
      toast.error("Enter your password.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data,
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : error.message,
      );
      return;
    }
    toast.success("Welcome back!");
    router.navigate({ to: "/", replace: true });
  };

  const signup = async () => {
    if (!name.trim()) {
      toast.error("Enter your name.");
      return;
    }
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    try {
      sessionStorage.setItem("neparena-email", parsed.data);
    } catch {
      /* ignore */
    }
    toast.success("Verification code sent to your email.");
    router.navigate({ to: "/auth/verify" });
  };

  const forgot = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent if the account exists.");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-lg font-bold tracking-tight text-white">
            NepARENA
          </Link>
          <p className="mt-1 text-sm text-neutral-500">
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl">
          <div className="mb-4 flex gap-1 rounded-full border border-white/10 bg-black/30 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition",
                mode === "login" ? "bg-white/10 text-white" : "text-neutral-500",
              )}
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition",
                mode === "signup" ? "bg-white/10 text-white" : "text-neutral-500",
              )}
            >
              <UserPlus className="h-3.5 w-3.5" /> Sign up
            </button>
          </div>

          <div className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label className="text-xs text-neutral-400">Name</Label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-white/10 bg-black/40 pl-9"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs text-neutral-400">Email</Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/10 bg-black/40 pl-9"
                  placeholder="you@email.com"
                  type="email"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-neutral-400">Password</Label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-black/40 pl-9 pr-10"
                  placeholder="••••••••"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => void forgot()}
                className="text-left text-[11px] text-sky-400 hover:underline"
              >
                Forgot password?
              </button>
            )}

            <Button
              type="button"
              disabled={busy}
              className="w-full bg-sky-500 text-white hover:bg-sky-400"
              onClick={() => void (mode === "login" ? login() : signup())}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          <Link to="/" className="text-neutral-400 hover:text-white">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
