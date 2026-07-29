import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      sessionStorage.setItem(
        "efn-otp-email",
        email
      );

      toast.success("OTP sent to your email");

      router.navigate({
        to: "/auth/verify",
      });

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "OTP failed"
      );
    }

    setLoading(false);
  };


  return (
    <div className="min-h-screen flex items-center justify-center">

      <form
        onSubmit={sendOTP}
        className="space-y-4 w-80"
      >

        <h1 className="text-2xl font-bold">
          eFootball Nepal Login
        </h1>

        <input
          className="border p-3 w-full rounded"
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
        />

        <button
          className="bg-black text-white p-3 w-full rounded"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send OTP"}
        </button>

      </form>

    </div>
  );
}
