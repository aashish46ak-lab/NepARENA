import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Mail, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth/")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.navigate({ to: "/" });
    }
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = z.string().email().safeParse(email.trim());

    if (!parsed.success) {
      toast.error("Please enter a valid email.");
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      sessionStorage.setItem("efn-email", parsed.data);
      sessionStorage.setItem(
        "efn-remember",
        remember ? "1" : "0"
      );

      toast.success("Verification code sent.");

      await router.navigate({
  to: "/auth/verify",
});

    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send verification code."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-hero">

      <div className="w-full max-w-md">

        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-6 font-bold"
        >
          <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>

          <span className="text-xl text-gradient-brand">
            eFootball Nepal
          </span>
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8">

          <h1 className="text-2xl font-bold text-center">
            Sign in
          </h1>

          <p className="mt-2 text-center text-muted-foreground text-sm">
            Enter your email to receive a 6-digit verification code.
          </p>

          <form
            onSubmit={submit}
            className="space-y-4 mt-6"
          >

            <div className="space-y-2">

              <Label htmlFor="email">
                Email Address
              </Label>

              <div className="relative">

                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input
                  id="email"
                  type="email"
                  autoFocus
                  required
                  placeholder="you@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) =>
                  setRemember(!!v)
                }
              />

              <Label htmlFor="remember">
                Remember me
              </Label>
                            <Label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remember me on this device
              </Label>

            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            A 6-digit verification code will be sent to your email.
            Enter that code on the next screen to sign in or create
            your account.
          </p>

        </div>

      </div>

    </div>
  );
}
