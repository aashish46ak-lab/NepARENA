import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";
import {
  Shield, Loader2, Trophy, Users, Settings, LayoutDashboard,
  History, Link2, ShieldCheck, Flag, MessageCircle,
  Newspaper, MoreVertical, User, ChevronDown,
} from "lucide-react";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { TournamentsPanel } from "@/components/admin/TournamentsPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { CommunityLinksPanel } from "@/components/admin/CommunityLinksPanel";
import { OwnerModeratorsPanel } from "@/components/admin/OwnerModeratorsPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";
import { MessagesInbox } from "@/components/MessagesInbox";
import { SocialFeed } from "@/components/SocialFeed";
import { getDefaultOrganizer, listOrganizerMemberships } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { t: string } => ({
    t: typeof search.t === "string" ? search.t : "dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Admin — Organizer Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

interface Section {
  id: string;
  label: string;
  icon: ElementType;
  ownerOnly?: boolean;
}

const SECTIONS: Section[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "players", label: "Players / Teams", icon: Users, ownerOnly: true },
  { id: "reports", label: "Results / Reports", icon: Flag },
  { id: "history", label: "History", icon: History },
  { id: "feed", label: "Posts", icon: Newspaper },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "team", label: "Team / Roles", icon: ShieldCheck },
  { id: "community", label: "Community Links", icon: Link2 },
  { id: "settings", label: "Site Settings", icon: Settings },
];

const MOD_ALLOWED = new Set(["tournaments", "reports", "messages", "feed"]);

function DashboardPage() {
  const { user, loading, isAdmin, isOwner, roles } = useAuth();
  const router = useRouter();
  const navigate = useNavigate({ from: "/dashboard" });
  const { t } = Route.useSearch();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgMeta, setOrgMeta] = useState<{ name: string; logo_url: string | null; slug: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [memberships, setMemberships] = useState<
    { organizer_id: string; role: string; organizer?: { id: string; name: string; slug: string; logo_url: string | null } }[]
  >([]);
  const [membershipsLoading, setMembershipsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    setMembershipsLoading(true);
    void (async () => {
      const rows = await listOrganizerMemberships(user.id);
      setMemberships(rows as typeof memberships);
      const first = rows[0];
      if (first?.organizer) {
        setOrgId(first.organizer_id);
        setOrgMeta({
          name: first.organizer.name,
          logo_url: first.organizer.logo_url ?? null,
          slug: first.organizer.slug,
        });
      } else {
        const o = await getDefaultOrganizer();
        setOrgId(o?.id ?? null);
        if (o) {
          setOrgMeta({
            name: o.name,
            logo_url: (o as { logo_url?: string | null }).logo_url ?? null,
            slug: o.slug,
          });
        }
      }
      setMembershipsLoading(false);
    })();
  }, [user?.id]);

  const selectOrg = (m: (typeof memberships)[0]) => {
    if (!m.organizer) return;
    setOrgId(m.organizer_id);
    setOrgMeta({
      name: m.organizer.name,
      logo_url: m.organizer.logo_url ?? null,
      slug: m.organizer.slug,
    });
    setOrgSwitcherOpen(false);
  };

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["org_messages_unread_nav", orgId],
    enabled: !!orgId,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("organizer_messages")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", orgId!)
        .eq("is_from_organizer", false)
        .eq("read_by_organizer", false);
      return count ?? 0;
    },
  });

  if (loading || !user || membershipsLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  const hasOrgMembership = memberships.length > 0;
  const canAccess = isAdmin || hasOrgMembership;
  if (!canAccess) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Shield className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-3xl font-bold">Organizer dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an organizer membership to open the dashboard. Apply to run a community, or ask an owner to add you to the team.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/become-organizer"
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
            >
              Become an organizer
            </Link>
            <Link to="/" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white">
              Back home
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const activeMembership = memberships.find((m) => m.organizer_id === orgId);
  const membershipRole = activeMembership?.role;
  const isOrgOwner = isOwner || membershipRole === "owner";
  const isModeratorOnly =
    !isOrgOwner &&
    (membershipRole === "moderator" || roles.includes("moderator")) &&
    membershipRole !== "admin" &&
    !roles.includes("admin");
  const roleLabel = isOrgOwner
    ? "Owner"
    : membershipRole === "admin" || roles.includes("admin")
      ? "Admin"
      : "Moderator";
  const visible = SECTIONS.filter((s) =>
    isModeratorOnly ? MOD_ALLOWED.has(s.id) : !s.ownerOnly || isOrgOwner,
  );
  const active = visible.some((s) => s.id === t) ? t : (visible[0]?.id ?? "dashboard");

  const NavLabel = ({ id, label }: { id: string; label: string }) => (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span className="truncate">{label}</span>
      {id === "messages" && unreadCount > 0 && (
        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </span>
  );

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-transparent px-3 py-2.5 sm:px-4">
          <div className="relative flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => memberships.length > 1 && setOrgSwitcherOpen((v) => !v)}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-xl text-left transition",
                memberships.length > 1 && "pr-1 hover:bg-white/[0.04] active:scale-[0.99]",
              )}
            >
              {orgMeta?.logo_url ? (
                <img
                  src={orgMeta.logo_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-md ring-1 ring-white/15"
                />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-sky-500/20">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="flex items-center gap-1.5 truncate text-lg font-bold tracking-tight md:text-xl">
                  <span className="truncate">{orgMeta?.name ?? "Organizer Dashboard"}</span>
                  {memberships.length > 1 && (
                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                  )}
                </h1>
                <p className="truncate text-[11px] text-neutral-500 sm:text-xs">
                  {user.email} · <span className="capitalize text-neutral-400">{roleLabel}</span>
                </p>
              </div>
            </button>
            {orgSwitcherOpen && memberships.length > 1 && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Close"
                  onClick={() => setOrgSwitcherOpen(false)}
                />
                <div className="absolute left-0 top-14 z-50 min-w-[240px] overflow-hidden rounded-2xl border border-white/12 bg-[#141416]/98 py-1.5 shadow-2xl backdrop-blur-xl">
                  <p className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Switch organizer
                  </p>
                  {memberships.map((m) => (
                    <button
                      key={m.organizer_id}
                      type="button"
                      onClick={() => selectOrg(m)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-white/8",
                        m.organizer_id === orgId ? "text-sky-300" : "text-neutral-100",
                      )}
                    >
                      {m.organizer?.logo_url ? (
                        <img src={m.organizer.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
                          <Shield className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {m.organizer?.name ?? "Organizer"}
                      </span>
                      <span className="text-[10px] capitalize text-neutral-500">{m.role}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-neutral-200 transition hover:bg-white/10"
              aria-label="Dashboard menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-50 min-w-[210px] overflow-hidden rounded-2xl border border-white/12 bg-[#141416]/98 py-1.5 shadow-2xl backdrop-blur-xl">
                  <Link
                    to="/members/$id"
                    params={{ id: user.id }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="h-4 w-4 text-sky-400" /> Switch to personal profile
                  </Link>
                  {orgMeta?.slug && (
                    <Link
                      to="/o/$slug"
                      params={{ slug: orgMeta.slug }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4 text-emerald-400" /> View public page
                    </Link>
                  )}
                  <Link
                    to="/"
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Newspaper className="h-4 w-4 text-neutral-400" /> Back to Home
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-60 shrink-0 lg:block">
            <nav className="glass sticky top-20 space-y-1 rounded-2xl p-3">
              {visible.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate({ search: { t: s.id } })}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                    active === s.id
                      ? "bg-gradient-to-r from-sky-500/20 to-violet-500/10 text-white ring-1 ring-sky-400/30"
                      : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100",
                  )}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  <NavLabel id={s.id} label={s.label} />
                </button>
              ))}
            </nav>
          </aside>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {visible.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate({ search: { t: s.id } })}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition",
                  active === s.id
                    ? "bg-gradient-to-r from-sky-500/25 to-violet-500/15 text-white ring-1 ring-sky-400/30"
                    : "glass text-muted-foreground",
                )}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
                {s.id === "messages" && unreadCount > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <main className="min-w-0 flex-1">
            {active === "dashboard" && <DashboardOverview />}
            {active === "feed" && (
              <SocialFeed
                organizerId={orgId ?? undefined}
                hideComposer={false}
                organizerMeta={orgMeta ? { name: orgMeta.name, logo_url: orgMeta.logo_url, slug: orgMeta.slug || "" } : undefined}
              />
            )}
            {active === "messages" && orgId && (
              <MessagesInbox mode="organizer" organizerId={orgId} />
            )}
            {active === "tournaments" && <TournamentsPanel />}
            {active === "players" && isOrgOwner && <UsersPanel />}
            {active === "reports" && <ReportsPanel />}
            {active === "history" && <HistoryPanel />}
            {active === "community" && <CommunityLinksPanel organizerId={orgId} />}
            {active === "team" && <OwnerModeratorsPanel />}
            {active === "settings" && <SiteSettingsPanel />}
          </main>
        </div>
      </div>
    </PageShell>
  );
}
