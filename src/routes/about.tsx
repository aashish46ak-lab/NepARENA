import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { useOwnerInfo, useModerators } from "@/hooks/useContent";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Crown,
  Shield,
  Mail,
  Target,
  Eye,
  Sparkles,
  Users,
  Trophy,
  Gamepad2,
  MessageCircle,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    ...buildSeoHead({
      title: "About NepARENA",
      description:
        "Vision, mission, founders, and everything about NepARENA — Nepal's social esports platform for tournaments, community, and competitive gaming.",
      path: "/about",
    }),
  }),
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
  const settings = useSiteSettings();
  const { data: owner } = useOwnerInfo();
  const { data: mods = [] } = useModerators();

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">About NepARENA</h1>
          <p className="mt-2 text-neutral-400">
            Nepal's home for competitive gaming, tournaments, and community.
          </p>
        </div>

        <Section icon={Eye} title="Vision">
          <p>
            To become the central platform where every Nepali gamer can compete, connect, and grow —
            uniting eFootball, esports, and social play under one premium experience.
          </p>
        </Section>

        <Section icon={Target} title="Mission">
          <p>
            Build a fair, mobile-first social esports platform that combines tournaments, real-time
            messaging, feeds, and games — so organizers and players can focus on competition, not
            logistics.
          </p>
        </Section>

        <Section icon={Sparkles} title="What is NepARENA">
          <p>
            {settings?.about_short ??
              "NepARENA is a multi-organizer esports and social platform for Nepal. Run tournaments, follow players, chat, post highlights, and play skill games — all in one place."}
          </p>
        </Section>

        <Section icon={Globe} title="Why NepARENA">
          <ul className="list-inside list-disc space-y-1.5">
            <li>Built for Nepali gamers and local organizers</li>
            <li>Real tournaments with fixtures, results, and verification</li>
            <li>Social layer: feed, follows, streaks, and DMs</li>
            <li>Mobile-first PWA with dark premium design</li>
            <li>Fair competition tools and community moderation</li>
          </ul>
        </Section>

        <Section icon={Trophy} title="What we offer">
          <ul className="list-inside list-disc space-y-1.5">
            <li>Tournament hosting & management for organizers</li>
            <li>Player profiles, streaks, and All-Time XI</li>
            <li>Social feed with photos, likes, comments, and reposts</li>
            <li>Direct messaging with message requests</li>
            <li>Skill games (penalty, quiz, higher/lower, and more)</li>
            <li>Notifications for follows, likes, comments, and events</li>
          </ul>
        </Section>

        <Section icon={Users} title="Community goals">
          <p>
            Grow a respectful, competitive community where new players feel welcome, top talent gets
            visibility, and organizers can run clean events at any scale.
          </p>
        </Section>

        <Section icon={Gamepad2} title="Platform features">
          <p>
            Multi-organizer sites, themed tournament pages, OCR result helpers, GA analytics for
            owners, PWA install, realtime chat & feed, follow graph, and login streaks.
          </p>
        </Section>

        {owner && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2 text-amber-400">
              <Crown className="h-4 w-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Founders</h2>
            </div>
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <Avatar className="h-24 w-24 ring-2 ring-sky-500/40">
                <AvatarImage src={owner.photo_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-lg text-white">
                  {owner.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <div className="text-xs text-neutral-500">{owner.title}</div>
                <h3 className="text-xl font-bold">{owner.name}</h3>
                <p className="mt-1 text-sm text-neutral-400">{owner.bio}</p>
                {owner.email && (
                  <div className="mt-2 inline-flex items-center gap-1 text-sm text-sky-400">
                    <Mail className="h-3.5 w-3.5" /> {owner.email}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {mods.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2 text-sky-400">
              <Shield className="h-4 w-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Team & Moderators</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {mods.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center"
                >
                  <Avatar className="mx-auto h-16 w-16 ring-2 ring-white/10">
                    <AvatarImage src={m.photo_url ?? undefined} />
                    <AvatarFallback>{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <h3 className="mt-2 font-semibold">{m.name}</h3>
                  <div className="text-xs text-sky-400">{m.role_title}</div>
                  {m.bio && <p className="mt-1 text-xs text-neutral-500">{m.bio}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <Section icon={MessageCircle} title="Contact">
          <p>
            For partnerships, tournament hosting, or support, reach out via the contact email on the
            founder card above, or message platform admins through in-app chat when signed in.
          </p>
        </Section>
      </div>
    </PageShell>
  );
}
