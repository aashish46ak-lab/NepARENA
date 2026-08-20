import { Link } from "@tanstack/react-router";
import { Info, Scale, Newspaper, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    to: "/about" as const,
    title: "About NepARENA",
    description: "Our mission, community, and what we offer players worldwide.",
    icon: Info,
    tint: "text-sky-300 bg-sky-500/15 border-sky-500/25",
  },
  {
    to: "/rules" as const,
    title: "Rules & Regulations",
    description: "Fair play rules for players and organizers everywhere.",
    icon: Scale,
    tint: "text-amber-300 bg-amber-500/15 border-amber-500/25",
  },
  {
    to: "/news" as const,
    title: "News",
    description: "Platform updates, announcements, and community news.",
    icon: Newspaper,
    tint: "text-violet-300 bg-violet-500/15 border-violet-500/25",
  },
  {
    to: "/guides" as const,
    title: "Guides",
    description: "Guides for players, organizers, and competitive communities.",
    icon: BookOpen,
    tint: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25",
  },
];

export function HomeInfoGrid() {
  return (
    <section className="mx-auto max-w-md px-3 py-4" aria-label="Platform information">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Learn more
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className={cn(
                "group rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition",
                "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]",
              )}
            >
              <div
                className={cn(
                  "mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border",
                  c.tint,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[13px] font-semibold leading-tight text-white group-hover:text-sky-100">
                {c.title}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-neutral-500 group-hover:text-neutral-400">
                {c.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
