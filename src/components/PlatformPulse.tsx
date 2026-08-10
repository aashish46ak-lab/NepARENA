import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Activity } from "lucide-react";

type PulseItem = {
  id: string;
  kind: "user" | "tournament" | "organizer";
  label: string;
  at: string;
};

/**
 * Lightweight public activity strip for the platform homepage.
 * No organizer-specific match data — only platform-level signals.
 */
export function PlatformPulse() {
  const { data: items = [] } = useQuery({
    queryKey: ["platform_pulse"],
    queryFn: loadPulse,
    staleTime: 60_000,
  });

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pb-14">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        <Activity className="h-4 w-4" /> Platform pulse
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <ul className="divide-y divide-white/5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="min-w-0 truncate text-neutral-300">{item.label}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-neutral-600">
                {formatRelative(item.at)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function loadPulse(): Promise<PulseItem[]> {
  const out: PulseItem[] = [];

  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .order("created_at", { ascending: false })
    .limit(4);
  for (const u of users ?? []) {
    out.push({
      id: `u-${u.id}`,
      kind: "user",
      label: `New member joined · @${u.username ?? "player"}`,
      at: u.created_at,
    });
  }

  const { data: orgs } = await supabase
    .from("organizers")
    .select("id, name, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(3);
  for (const o of orgs ?? []) {
    out.push({
      id: `o-${o.id}`,
      kind: "organizer",
      label: `Organizer live · ${o.name}`,
      at: o.created_at,
    });
  }

  const { data: tours } = await supabase
    .from("tournaments")
    .select("id, name, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(4);
  for (const t of tours ?? []) {
    out.push({
      id: `t-${t.id}`,
      kind: "tournament",
      label: `Tournament listed · ${t.name}`,
      at: t.created_at,
    });
  }

  return out
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8);
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
