import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { buildSeoHead, absImage, SITE_NAME } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { OrganizerSubnav } from "@/components/OrganizerSubnav";
import { getOrganizerContext, setOrganizerContext } from "@/lib/organizer-context";
import { getOrganizerBySlug, getFollowerCount } from "@/lib/organizers";
import { listOrganizerTeam } from "@/lib/organizer-team";
import { supabase } from "@/lib/supabase";
import { PlatformIcon } from "@/lib/platforms";
import {
  Mail, Target, Eye, Sparkles, Trophy, Gamepad2, MessageCircle, Globe, Users,
  Loader2, BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/about")({
  validateSearch: (s: Record<string, unknown>): { org?: string } => ({
    org: typeof s.org === "string" ? s.org : undefined,
  }),
  loader: async ({ location }) => {
    const q = (location.search as { org?: string }).org;
    if (!q) return { org: null as Awaited<ReturnType<typeof getOrganizerBySlug>> };
    const org = await getOrganizerBySlug(q);
    return { org };
  },
  head: ({ loaderData, location }) => {
    const org = loaderData?.org;
    const q = (location.search as { org?: string }).org;
    if (org) {
      const title = `About ${org.name}`;
      const desc = org.description || org.tagline || `About ${org.name} on ${SITE_NAME}`;
      const path = q ? `/about?org=${encodeURIComponent(q)}` : "/about";
      return {
        ...buildSeoHead({
          title,
          description: desc,
          path,
          image: absImage(org.logo_url || org.banner_url),
          type: "profile",
        }),
      };
    }
    return {
      ...buildSeoHead({
        title: "About — NepARENA",
        description: "About the organizer community or NepARENA platform.",
        path: "/about",
      }),
    };
  },
  component: AboutPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="mb-3 flex items-center gap-2 text-sky-400">
        <Icon className="h-4 w-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-neutral-300">{children}</div>
    </section>
  );
}

function AboutPage() {
  const search = Route.useSearch();
  const ctx = typeof window !== "undefined" ? getOrganizerContext() : null;
  const slug = search.org || ctx?.slug;

  if (slug) {
    return <OrganizerAbout slug={slug} />;
  }
  return <PlatformAbout />;
}

function OrganizerAbout({ slug }: { slug: string }) {
  const { data: org, isLoading } = useQuery({
    queryKey: ["organizer_about", slug],
    queryFn: () => getOrganizerBySlug(slug),
  });

  useEffect(() => {
    if (org) {
      setOrganizerContext({
        slug: org.slug,
        id: org.id,
        name: org.name,
        logo_url: org.logo_url,
      });
    }
  }, [org?.id, org?.slug]);

  const { data: followers = 0 } = useQuery({
    queryKey: ["org_followers_about", org?.id],
    enabled: !!org?.id,
    queryFn: () => getFollowerCount(org!.id),
  });

  const { data: tourneyCount = 0 } = useQuery({
    queryKey: ["org_tourney_count", org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("tournaments")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", org!.id)
        .eq("is_published", true);
      return count ?? 0;
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["organizer_team", org?.id],
    enabled: !!org?.id,
    queryFn: () => listOrganizerTeam(org!.id),
  });

  if (isLoading) {
    return (
      <PageShell force="organizer" hideChrome>
        <OrganizerSubnav title="About" />
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
        </div>
      </PageShell>
    );
  }

  if (!org) {
    return (
      <PageShell force="organizer" hideChrome>
        <OrganizerSubnav title="About" />
        <div className="py-20 text-center text-neutral-500">Organizer not found</div>
      </PageShell>
    );
  }

  const socials: { key: string; href: string }[] = [];
  if (org.facebook_url) socials.push({ key: "facebook", href: org.facebook_url });
  if (org.instagram_url) socials.push({ key: "instagram", href: org.instagram_url });
  if (org.discord_url) socials.push({ key: "discord", href: org.discord_url });
  if (org.website_url) socials.push({ key: "website", href: org.website_url });

  return (
    <PageShell force="organizer" hideChrome>
      <OrganizerSubnav title="About" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-2">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {org.logo_url ? (
            <img src={org.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/15" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-neutral-700 text-2xl font-bold">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{org.name}</h1>
              {org.is_verified && (
                <Badge className="bg-sky-500/25 text-sky-200">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </div>
            {org.tagline && <p className="mt-1 text-sm text-neutral-400">{org.tagline}</p>}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-neutral-300">
          {org.description || org.tagline || "Competitive esports community on NepARENA."}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Followers" value={followers} />
          <Stat label="Tournaments" value={tourneyCount} />
          <Stat label="Status" value={org.status} />
          <Stat
            label="Joined"
            value={org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
          />
        </div>

        {team.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3 animate-in fade-in duration-300">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Owner, Admins & Moderators</h2>
            <p className="text-xs text-neutral-500">Managed from the organizer dashboard — always in sync.</p>
            <ul className="space-y-2">
              {team.map((m) => {
                const name = m.full_name?.trim() || m.username?.trim() || "Member";
                const roleLabel = m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Moderator";
                return (
                  <li key={`${m.user_id}-${m.role}`}>
                    <Link
                      to="/members/$id"
                      params={{ id: m.user_id }}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 transition hover:border-sky-400/30 hover:bg-sky-500/5"
                    >
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/15" />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-700 text-xs font-bold text-white">
                          {name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-sm font-medium text-white">{name}</p>
                          {m.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                        </div>
                        <p className="text-[11px] text-neutral-500">{roleLabel}{m.username ? ` · @${m.username}` : ""}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {(org.contact_email || socials.length > 0) && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Contact</h2>
            {org.contact_email && (
              <a href={`mailto:${org.contact_email}`} className="flex items-center gap-2 text-sm text-sky-400 hover:underline">
                <Mail className="h-4 w-4" /> {org.contact_email}
              </a>
            )}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
                  >
                    <PlatformIcon platform={s.key} className="h-4 w-4" />
                    {s.key}
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        <p className="text-center text-xs text-neutral-500">
          Powered by <Link to="/" className="text-sky-400 hover:underline">NepARENA</Link>
        </p>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="text-lg font-bold capitalize tabular-nums text-white">{value}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}

function PlatformAbout() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">About NepARENA</h1>
          <p className="mt-2 text-neutral-400">
            A global multi-organizer esports platform — open to players and communities worldwide.
          </p>
        </div>

        <Section icon={Eye} title="Vision">
          <p>
            To be the go-to platform where gamers and tournament organizers anywhere can compete,
            connect, and grow — uniting esports, social play, and community under one premium experience.
          </p>
        </Section>

        <Section icon={Target} title="Mission">
          <p>
            Build a fair, mobile-first social esports platform that combines tournaments, real-time
            messaging, feeds, and games — so organizers and players can focus on competition, not logistics.
          </p>
        </Section>

        <Section icon={Sparkles} title="What is NepARENA">
          <p>
            NepARENA is a multi-organizer esports and social platform. Run tournaments, follow players,
            chat, post highlights, and play skill games — all in one place.
          </p>
        </Section>

        <Section icon={Globe} title="For players worldwide">
          <ul className="list-inside list-disc space-y-1.5">
            <li>Open to gamers and organizers globally</li>
            <li>Real tournaments with fixtures, results, and verification</li>
            <li>Social layer: feed, follows, streaks, and DMs</li>
            <li>Mobile-first PWA with dark premium design</li>
          </ul>
        </Section>

        <Section icon={Trophy} title="What we offer">
          <ul className="list-inside list-disc space-y-1.5">
            <li>Tournament hosting & management for organizers</li>
            <li>Player profiles, streaks, and social feed</li>
            <li>Direct messaging and skill games</li>
          </ul>
        </Section>

        <Section icon={Users} title="Community goals">
          <p>
            Grow a respectful, competitive community where new players feel welcome and organizers
            can run clean events at any scale.
          </p>
        </Section>

        <Section icon={Gamepad2} title="Platform features">
          <p>
            Multi-organizer sites, themed pages, PWA install, realtime chat & feed, and login streaks.
          </p>
        </Section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
            Platform founders
          </p>
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">Founders</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FounderCard initials="AK" role="Founder" name="Ashish Khadka" email="aashish46ak@gmail.com" focus="Platform vision & product architecture" />
            <FounderCard initials="AB" role="Co-Founder" name="Ashish Baral" email="baralk851@gmail.com" focus="Strategic planning & community growth" />
          </div>
        </section>

        <Section icon={MessageCircle} title="Contact">
          <p>
            For partnerships or support:{" "}
            <a href="mailto:neparena2083@gmail.com" className="text-sky-400 hover:underline">
              neparena2083@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </PageShell>
  );
}

function FounderCard({
  initials, role, name, email, focus,
}: { initials: string; role: string; name: string; email: string; focus: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-4">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-400 text-sm font-bold text-black">
        {initials}
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-neutral-500">{role}</p>
      <h3 className="text-base font-semibold text-neutral-100">{name}</h3>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-neutral-400">
        <Mail className="h-3.5 w-3.5" />
        {email}
      </p>
      <p className="mt-1 text-sm text-neutral-500">{focus}</p>
    </div>
  );
}
