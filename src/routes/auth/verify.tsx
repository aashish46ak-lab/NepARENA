/**
 * Email OTP verify — native 6-digit inputs (no input-otp lib dependency).
 * Supabase: verifyOtp / resend / signInWithOtp / resetPasswordForEmail unchanged.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, OWNER_EMAIL } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth/verify")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { email?: string; type?: string } => ({
    email: typeof s.email === "string" ? s.email : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify email — NepARENA" },
      {
        name: "description",
        content: "Enter the 6-digit verification code sent to your email.",
      },
    ],
  }),
  component: VerifyPage,
});

type OtpType = "signup" | "recovery" | "email";

function readStoredType(searchType?: string): OtpType {
  if (searchType === "signup" || searchType === "recovery" || searchType === "email") {
    return searchType;
  }
  try {
    const t =
      sessionStorage.getItem("neparena-otp-type") ||
      sessionStorage.getItem("efn-otp-type");
    if (t === "signup" || t === "recovery" || t === "email") return t;
  } catch {
    /* private mode */
  }
  return "email";
}

function readStoredEmail(searchEmail?: string): string {
  if (searchEmail?.trim()) return searchEmail.trim();
  try {
    return (
      sessionStorage.getItem("neparena-email") ||
      sessionStorage.getItem("efn-email") ||
      localStorage.getItem("neparena-email") ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

/** Six separate digit boxes — always visible, works without input-otp */
function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const setAt = (index: number, char: string) => {
    const next = digits.map((d, i) => (i === index ? char : d));
    onChange(next.join("").slice(0, 6));
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setAt(index, "");
      return;
    }
    if (cleaned.length > 1) {
      const full = cleaned.slice(0, 6);
      onChange(full);
      const focusIdx = Math.min(full.length, 5);
      refs.current[focusIdx]?.focus();
      return;
    }
    setAt(index, cleaned);
    if (index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setAt(index, "");
      } else if (index > 0) {
        setAt(index - 1, "");
        refs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-11 rounded-xl border border-white/20 bg-white/[0.08] text-center text-lg font-semibold text-white outline-none ring-offset-0 transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

function VerifyPage() {
  const router = useRouter();
  const search = Route.useSearch();

  const otpType = useMemo(() => readStoredType(search.type), [search.type]);
  const initialEmail = useMemo(() => readStoredEmail(search.email), [search.email]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!initialEmail) return;
    try {
      sessionStorage.setItem("neparena-email", initialEmail);
      if (search.type) sessionStorage.setItem("neparena-otp-type", search.type);
    } catch {
      /* ignore */
    }
  }, [initialEmail, search.type]);

  const redirectByRole = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.navigate({ to: "/" });
      return;
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleData ?? []).map((r: { role: string }) => r.role);
    const isOwner =
      user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() ||
      roles.includes("owner");
    router.navigate({
      to: isOwner || roles.includes("moderator") ? "/dashboard" : "/",
    });
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Enter the email you used to sign up.");
      return;
    }
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }

    try {
      sessionStorage.setItem("neparena-email", cleanEmail);
    } catch {
      /* ignore */
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: code,
        type: otpType,
      });
      if (error) throw error;

      if (otpType === "recovery") {
        toast.success("Code verified — set your new password.");
        router.navigate({ to: "/reset-password" });
        return;
      }

      if (otpType === "signup") {
        const fullName =
          sessionStorage.getItem("neparena-fullname") ||
          sessionStorage.getItem("efn-fullname");
        if (fullName && data.user) {
          await supabase
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", data.user.id);
        }
        sessionStorage.removeItem("neparena-fullname");
        sessionStorage.removeItem("efn-fullname");
        toast.success("Account verified — welcome to NepARENA!");
      } else {
        toast.success("Login successful!");
      }

      sessionStorage.removeItem("neparena-otp-type");
      sessionStorage.removeItem("efn-otp-type");
      await redirectByRole();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Enter your email first.");
      return;
    }
    setResending(true);
    let error: { message: string } | null = null;
    if (otpType === "signup") {
      ({ error } = await supabase.auth.resend({ type: "signup", email: cleanEmail }));
    } else if (otpType === "recovery") {
      ({ error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      }));
    } else {
      ({ error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: true },
      }));
    }
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("A new code is on its way.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-md">
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

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-sky-500/20 ring-1 ring-sky-400/30">
            <MailCheck className="h-7 w-7 text-sky-300" />
          </div>

          <h1 className="text-center text-2xl font-bold text-white">
            {otpType === "recovery" ? "Reset your password" : "Enter verification code"}
          </h1>
          <p className="mt-2 text-center text-sm text-neutral-400">
            {email.trim() ? (
              <>
                We sent a 6-digit code to
                <br />
                <strong className="text-neutral-100">{email.trim()}</strong>
              </>
            ) : (
              "Enter your email and the 6-digit code from your inbox."
            )}
          </p>

          <form onSubmit={verify} className="mt-6 space-y-5">
            {!initialEmail && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400" htmlFor="verify-email">
                  Email
                </label>
                <Input
                  id="verify-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="h-11 border-white/10 bg-white/[0.04] text-white"
                />
              </div>
            )}

            <OtpBoxes value={code} onChange={setCode} disabled={loading} />

            <Button
              type="submit"
              className="w-full bg-sky-500 text-white hover:bg-sky-400"
              disabled={loading || code.length !== 6 || !email.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : otpType === "recovery" ? (
                "Verify & continue"
              ) : (
                "Verify & sign in"
              )}
            </Button>

            <p className="text-center text-xs text-neutral-500">
              Didn't get the code?{" "}
              <button
                type="button"
                onClick={() => void resend()}
                disabled={resending || !email.trim()}
                className="text-sky-400 hover:underline disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
              {" · "}
              <Link to="/auth" className="text-neutral-400 hover:text-neutral-200 hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
