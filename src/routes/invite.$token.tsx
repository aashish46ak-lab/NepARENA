/**
 * Accept organizer invitation — /invite/:token
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { acceptInvitation, getInvitationByToken } from "@/lib/organizers";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  component: InviteAcceptPage,
});

function InviteAcceptPage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getInvitationByToken>>>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void getInvitationByToken(token).then(setInfo);
  }, [token]);

  const onAccept = async () => {
    if (!user) {
      router.navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    const res = await acceptInvitation({ token, userId: user.id });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDone(true);
    toast.success("You are now the organizer owner");
    setTimeout(() => router.navigate({ to: "/dashboard" }), 800);
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Organizer invitation</h1>
        {!info ? (
          <div className="mt-8">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : info.status !== "pending" ? (
          <p className="mt-4 text-muted-foreground">This invitation is no longer valid.</p>
        ) : (
          <>
            <p className="mt-3 text-muted-foreground">
              You are invited to manage{" "}
              <span className="text-foreground font-semibold">
                {info.organizer?.name ?? "an organizer"}
              </span>
              .
            </p>
            {loading ? (
              <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin" />
            ) : !user ? (
              <div className="mt-8 space-y-3">
                <p className="text-sm">Sign in or create an account with the invited email.</p>
                <Button asChild className="bg-gradient-brand text-primary-foreground">
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
            ) : done ? (
              <p className="mt-8 text-emerald-400">Accepted — opening dashboard…</p>
            ) : (
              <Button
                className="mt-8 bg-gradient-brand text-primary-foreground"
                onClick={onAccept}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept & open dashboard"}
              </Button>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
