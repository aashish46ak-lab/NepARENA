import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { PageShell } from "@/components/PageShell";
import { Mail, Target, Eye, Sparkles, Trophy, Gamepad2, MessageCircle, Globe, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    ...buildSeoHead({
      title: "About NepARENA",
      description:
        "NepARENA is a global multi-organizer esports platform — tournaments, community, messaging, and competitive gaming for players worldwide.",
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
            chat, post highlights, and play skill games — all in one place. Built for everyone who loves
            competitive gaming, not limited to any single country or community.
          </p>
        </Section>

        <Section icon={Globe} title="For players worldwide">
          <ul className="list-inside list-disc space-y-1.5">
            <li>Open to gamers and organizers globally</li>
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
            Grow a respectful, competitive community where new players feel welcome, talent gets
            visibility, and organizers can run clean events at any scale — anywhere in the world.
          </p>
        </Section>

        <Section icon={Gamepad2} title="Platform features">
          <p>
            Multi-organizer sites, themed tournament pages, OCR result helpers, analytics for owners,
            PWA install, realtime chat & feed, follow graph, and login streaks.
          </p>
        </Section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
            Platform founders
          </p>
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">Founders</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FounderCard
              initials="AK"
              role="Founder"
              name="Ashish Khadka"
              email="aashish46ak@gmail.com"
              focus="Platform vision & product architecture"
            />
            <FounderCard
              initials="AB"
              role="Co-Founder"
              name="Ashish Baral"
              email="baralk851@gmail.com"
              focus="Strategic planning & community growth"
            />
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Organizer admins and moderators are managed separately inside each organizer community —
            they are not platform founders.
          </p>
        </section>

        <Section icon={MessageCircle} title="Contact">
          <p>
            For partnerships, tournament hosting, or support:{" "}
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
  initials,
  role,
  name,
  email,
  focus,
}: {
  initials: string;
  role: string;
  name: string;
  email: string;
  focus: string;
}) {
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
