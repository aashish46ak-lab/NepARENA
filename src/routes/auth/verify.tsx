import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase, OWNER_EMAIL } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth/verify")({
  ssr: false,
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

function storedType(): OtpType {
  const t =
    sessionStorage.getItem("neparena-otp-type") ||
    sessionStorage.getItem("efn-otp-type");
  return t === "signup" || t === "recovery" || t === "email" ? t : "email";
}

function VerifyPage() {
  const router = useRouter();

  const email =
    sessionStorage.getItem("neparena-email") ||
    sessionStorage.getItem("efn-email") ||
    "";
  const otpType = storedType();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

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
    if (!email) {
      toast.error("Missing email — please start again.");
      return;
    }
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
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
    if (!email) return;
    setResending(true);
    let error: { message: string } | null = null;
    if (otpType === "signup") {
      ({ error } = await supabase.auth.resend({ type: "signup", email }));
    } else if (otpType === "recovery") {
      ({ error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      }));
    } else {
      ({ error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      }));
    }
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("A new code is on its way.");
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
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-gradient-brand glow-brand">
            <MailCheck className="h-7 w-7 text-primary-foreground" />
          </div>

          <h1 className="text-center text-2xl font-bold">
            {otpType === "recovery" ? "Reset your password" : "Check your inbox"}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {email ? (
              <>
                We sent a 6-digit code to
                <br />
                <strong className="text-foreground">{email}</strong>
              </>
            ) : (
              "We couldn't find your email for this verification."
            )}
          </p>

          {email ? (
            <form onSubmit={verify} className="mt-6 space-y-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : otpType === "recovery" ? (
                  "Verify & continue"
                ) : (
                  "Verify & sign in"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Didn't get the code?{" "}
                <button
                  type="button"
                  onClick={resend}
                  disabled={resending}
                  className="text-brand-glow hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </p>
            </form>
          ) : (
            <Button
              asChild
              className="mt-6 w-full bg-gradient-brand text-primary-foreground"
            >
              <Link to="/auth">Back to sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
