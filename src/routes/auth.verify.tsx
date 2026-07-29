import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Trophy, Loader2, ArrowLeft } from "lucide-react";

const MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/auth/verify")({
  ssr: false,
  head: () => ({ meta: [{ title: "Verify — eFootball Nepal" }, { name: "description", content: "Enter the 6-digit code sent to your email." }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const startedRef = useRef(false);

  useEffect(() => {
    const e = sessionStorage.getItem("efn-otp-email");
    if (!e) { router.navigate({ to: "/auth" }); return; }
    setEmail(e);
  }, [router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (code.length === 6 && !verifying && !startedRef.current) {
      startedRef.current = true;
      verify(code);
    }
    if (code.length < 6) startedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const verify = async (token: string) => {
    if (!email) return;
    if (attempts >= MAX_ATTEMPTS) { toast.error("Too many attempts. Please request a new code."); return; }
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      if (!data.session) throw new Error("Verification succeeded but no session was returned.");
      // Ensure profile exists (defense-in-depth; trigger should have created it)
      await supabase.from("profiles").upsert(
        { id: data.user!.id, username: data.user!.email?.split("@")[0] ?? null },
        { onConflict: "id", ignoreDuplicates: true },
      );
      toast.success("Signed in!");
      sessionStorage.removeItem("efn-otp-email");
      sessionStorage.removeItem("efn-otp-remember");
      router.navigate({ to: "/" });
    } catch (err) {
      setAttempts((n) => n + 1);
      setCode("");
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (!email || secondsLeft > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
      setSecondsLeft(60);
      setAttempts(0);
      toast.success("A new code has been sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
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
        <div className="glass rounded-2xl p-6 md:p-8 text-center">
          <h1 className="text-2xl font-bold">Enter your 6-digit code</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sent to <span className="text-foreground font-medium">{email ?? "…"}</span>
          </p>
          <div className="mt-6 flex justify-center">
            <InputOTP value={code} onChange={setCode} maxLength={6} disabled={verifying || attempts >= MAX_ATTEMPTS} autoFocus>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {verifying && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-brand-glow">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
            </div>
          )}
          {attempts > 0 && attempts < MAX_ATTEMPTS && (
            <div className="mt-3 text-xs text-destructive">Incorrect code. {MAX_ATTEMPTS - attempts} attempt(s) remaining.</div>
          )}
          {attempts >= MAX_ATTEMPTS && (
            <div className="mt-3 text-xs text-destructive">Too many attempts. Please request a new code.</div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="outline" className="border-brand/40" onClick={resend} disabled={secondsLeft > 0 || resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
            </Button>
            <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Use a different email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}