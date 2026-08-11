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

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.navigate({ to: "/" });
    }
  }, [loading, user, router]);

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
  };

  const signup = async () => {
    const trimmedName = name.trim();
    const parsed = emailSchema.safeParse(email);
    if (trimmedName.length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!parsed.success) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data,
      password,
      options: {
        data: { full_name: trimmedName },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    sessionStorage.setItem("neparena-email", parsed.data);
    sessionStorage.setItem("neparena-fullname", trimmedName);
    sessionStorage.setItem("neparena-otp-type", "signup");
    sessionStorage.setItem("efn-email", parsed.data);
    sessionStorage.setItem("efn-fullname", trimmedName);
    sessionStorage.setItem("efn-otp-type", "signup");
    toast.success("Verification code sent to your email.");
    router.navigate({ to: "/auth/verify" });
  };

  const forgotPassword = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    sessionStorage.setItem("neparena-email", parsed.data);
    sessionStorage.setItem("neparena-otp-type", "recovery");
    sessionStorage.setItem("efn-email", parsed.data);
    sessionStorage.setItem("efn-otp-type", "recovery");
    toast.success("Password reset code sent to your email.");
    router.navigate({ to: "/auth/verify" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    void (mode === "login" ? login() : signup());
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-md animate-enter">
        <Link to="/" className="mb-6 flex flex-col items-center gap-3">
          <img
            src="/neparena-logo.png"
            alt="NepARENA logo"
            className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-1 ring-white/15"
            onError={(e) => {
              e.currentTarget.src = "/pwa-192x192.png";
            }}
          />
          <span className="text-2xl font-bold tracking-tight text-neutral-100">
            NepARENA
          </span>
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-secondary/50 p-1">
            {(
              [
                { id: "login", label: "Sign in", icon: LogIn },
                { id: "signup", label: "Create account", icon: UserPlus },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  mode === t.id
                    ? "bg-gradient-brand text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          <h1 className="text-center text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Join NepARENA"}
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in with your email and password."
              : "Create your account — we'll email you a 6-digit code to verify it."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    autoFocus
                    required
                    maxLength={100}
                    placeholder="Your full name"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoFocus={mode === "login"}
                  required
                  placeholder="you@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={forgotPassword}
                    className="text-xs text-brand-glow hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder={
                    mode === "signup" ? "At least 8 characters" : "Your password"
                  }
                  className="px-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "login"
              ? "New here? Switch to Create account above."
              : "After signing up you'll verify your email once — then log in with your password anytime."}
          </p>
        </div>
      </div>
    </div>
  );
}
