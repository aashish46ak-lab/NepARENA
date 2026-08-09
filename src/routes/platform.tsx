/**
 * NepARENA Super Admin dashboard — ONLY aashish46ak@gmail.com
 * Separate from organizer /dashboard (which stays the reusable template).
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
  type Organizer,
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
          <h1 className="mt-4 text-2xl font-bold">Super Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This {PLATFORM_NAME} control panel is restricted.
          </p>
          <Link to="/" className="mt-6 inline-block text-brand">
            Back home
          </Link>
        </div>
      </PageShell>
    );
  }

  const onInvite = async () => {
    if (!user) return;
    setBusy(true);
    setLastInviteLink(null);
    const res = await inviteOrganizer({
      email,
      name,
      invitedBy: user.id,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const link = `${window.location.origin}/invite/${res.token}`;
    setLastInviteLink(link);
    toast.success(`Invitation created for ${email}`);
    setEmail("");
    setName("");
    void reload();
  };

  const onStatus = async (o: Organizer, status: Organizer["status"]) => {
    const { error } = await setOrganizerStatus(o.id, status);
    if (error) toast.error(error.message);
    else {
      toast.success(`${o.name} → ${status}`);
      void reload();
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold md:text-3xl">{PLATFORM_NAME} Platform</h1>
            <p className="text-sm text-muted-foreground">
              Super Admin · {user.email}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">Organizer dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <StatCard icon={Building2} label="Organizers" value={stats?.organizers ?? "—"} />
          <StatCard icon={Trophy} label="Tournaments" value={stats?.tournaments ?? "—"} />
          <StatCard icon={Users} label="Players" value={stats?.players ?? "—"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4 mb-10 text-sm">
          <Badge className="justify-center py-2" variant="outline">
            Active: {stats?.byStatus.active ?? 0}
          </Badge>
          <Badge className="justify-center py-2" variant="outline">
            Pending: {stats?.byStatus.pending ?? 0}
          </Badge>
          <Badge className="justify-center py-2" variant="outline">
            Suspended: {stats?.byStatus.suspended ?? 0}
          </Badge>
          <Badge className="justify-center py-2" variant="outline">
            Verified: {stats?.byStatus.verified ?? 0}
          </Badge>
        </div>

        <section className="glass rounded-2xl p-5 md:p-6 mb-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite organizer
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Creates a pending organizer + unique invite link. Share the link so they can accept and get their dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Organizer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={onInvite} disabled={busy || !name.trim() || !email.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
            </Button>
          </div>
          {lastInviteLink && (
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs break-all">
              <div className="font-medium mb-1">Invite link (copy & send):</div>
              <a href={lastInviteLink} className="text-brand underline">
                {lastInviteLink}
              </a>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Organizers</h2>
          {!stats?.organizersList?.length ? (
            <p className="text-sm text-muted-foreground">
              No organizers yet — run <code className="text-xs">11-neparena-organizers.sql</code> in
              Supabase, or create an invite above.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.organizersList.map((o) => (
                <div
                  key={o.id}
                  className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{o.name}</div>
                    <div className="text-xs text-muted-foreground">
                      /o/{o.slug} · {o.contact_email ?? "—"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {o.status}
                      </Badge>
                      {o.is_verified && (
                        <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300">
                          verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/o/$slug" params={{ slug: o.slug }}>
                        Public page
                      </Link>
                    </Button>
                    {o.status !== "active" && (
                      <Button size="sm" variant="outline" onClick={() => onStatus(o, "active")}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
                      </Button>
                    )}
                    {o.status !== "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => onStatus(o, "suspended")}>
                        <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-gradient-brand">{value}</div>
    </div>
  );
}
