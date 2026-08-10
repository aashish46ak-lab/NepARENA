/**
 * NepARENA Super Admin — aashish46ak@gmail.com only.
 * Shows platform signup metrics + organizer invites.
 * Organizer member lists stay on each organizer dashboard.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import {
  getPlatformStats,
  inviteOrganizer,
  isSuperAdminEmail,
  setOrganizerStatus,
  PLATFORM_NAME,
} from "@/lib/organizers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Loader2,
  Shield,
  Trophy,
  Users,
  UserPlus,
  Ban,
  CheckCircle,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/platform")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `${PLATFORM_NAME} — Super Admin` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformPage,
});

function PlatformPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlatformStats>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const allowed = isSuperAdminEmail(user?.email);

  const reload = async () => {
    setStats(await getPlatformStats());
  };

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  useEffect(() => {
    if (allowed) void reload();
  }, [allowed]);

  if (loading || !user) {
    return (
      <PageShell>
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!allowed) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg py-20 text-center px-4">
          <Shield className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-xl font-semibold">Super Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the platform owner account to open this panel.
          </p>
          <Link to="/" className="mt-6 inline-block text-brand underline">
            Back home
          </Link>
        </div>
      </PageShell>
    );
  }

  const maxBar = Math.max(stats?.players ?? 1, stats?.tournaments ?? 1, stats?.organizers ?? 1, 1);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{PLATFORM_NAME}</p>
          <h1 className="mt-1 text-3xl font-bold text-gradient-brand">Super Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform-wide signups and organizer control. Member details live inside each organizer workspace.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard icon={Users} label="Signed-up members" value={stats?.players ?? "—"} />
          <MetricCard icon={Trophy} label="Tournaments" value={stats?.tournaments ?? "—"} />
          <MetricCard icon={Building2} label="Organizers" value={stats?.organizers ?? "—"} />
        </div>

        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Growth snapshot
          </h2>
          <Bar label="Members" value={stats?.players ?? 0} max={maxBar} />
          <Bar label="Tournaments" value={stats?.tournaments ?? 0} max={maxBar} />
          <Bar label="Organizers" value={stats?.organizers ?? 0} max={maxBar} />
        </div>

        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Invite organizer
          </h2>
          <p className="text-sm text-muted-foreground">
            Invite by Gmail. They open the link, create their organizer page, and get the same dashboard template as eFootball Nepal.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Organizer name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Gmail address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button
            disabled={busy || !email.trim() || !name.trim()}
            className="bg-gradient-brand"
            onClick={async () => {
              if (!user) return;
              setBusy(true);
              const res = await inviteOrganizer({
                email: email.trim(),
                name: name.trim(),
                invitedBy: user.id,
              });
              setBusy(false);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              const link = `${window.location.origin}/invite/${res.token}`;
              setLastInviteLink(link);
              toast.success("Invite created");
              setEmail("");
              setName("");
              void reload();
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate invite link"}
          </Button>
          {lastInviteLink && (
            <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-sm break-all flex gap-2 items-start">
              <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-brand" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Share this link</p>
                <a href={lastInviteLink} className="text-brand underline">
                  {lastInviteLink}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Organizers
          </h2>
          <div className="space-y-2">
            {(stats?.organizersList ?? []).map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /o/{o.slug} · {o.contact_email ?? "no email"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{o.status}</Badge>
                  {o.status !== "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await setOrganizerStatus(o.id, "active");
                        toast.success("Activated");
                        void reload();
                      }}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
                    </Button>
                  )}
                  {o.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await setOrganizerStatus(o.id, "suspended");
                        toast.success("Suspended");
                        void reload();
                      }}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Link to="/o/$slug" params={{ slug: o.slug }}>
                    <Button size="sm" variant="secondary">
                      Open page
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {!stats?.organizersList?.length && (
              <p className="text-sm text-muted-foreground">No organizers yet. Run SQL 11 + 12, then invite.</p>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
