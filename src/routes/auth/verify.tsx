import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  const router = useRouter();

  const email = sessionStorage.getItem("efn-email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) throw error;

      toast.success("Login successful!");

      router.navigate({
        to: "/",
      });

        } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Invalid verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-hero">
      <div className="w-full max-w-md glass rounded-2xl p-6 md:p-8">

        <h1 className="text-2xl font-bold text-center">
          Verify Email
        </h1>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the 6-digit code sent to
          <br />
          <strong>{email}</strong>
        </p>

        <form onSubmit={verify} className="mt-6 space-y-4">

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            className="text-center text-lg tracking-[0.4em]"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verify & Sign In"
            )}
          </Button>

        </form>

      </div>
    </div>
  );
}
