import { useEffect, useState } from "react";
import { X, Trophy, Settings, Users, Link2, Newspaper, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Trophy,
    title: "Tournaments",
    body: "Create and manage cups for your game. Only tournaments you create show here — not other organizers.",
  },
  {
    icon: Newspaper,
    title: "Feed / posts",
    body: "Post announcements for your community. They appear on your public organizer page.",
  },
  {
    icon: Link2,
    title: "Community links",
    body: "Add Discord, Facebook, WhatsApp — only for your page. Other organizers have their own links.",
  },
  {
    icon: Users,
    title: "Team",
    body: "Invite admins and moderators who help run your events.",
  },
  {
    icon: Settings,
    title: "Settings",
    body: "Update logo, name, and description. Public visitors see this on your About page.",
  },
  {
    icon: MessageCircle,
    title: "Messages",
    body: "Reply to players who message your organizer page.",
  },
];

export function DashboardOnboarding({
  organizerName,
  organizerId,
}: {
  organizerName?: string | null;
  organizerId?: string | null;
}) {
  const key = organizerId ? `neparena-dash-onboard-${organizerId}` : "neparena-dash-onboard";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!organizerId) return;
    try {
      if (localStorage.getItem(key) === "1") return;
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, [organizerId, key]);

  const dismiss = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/15 via-[#121214] to-violet-500/10 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            Dashboard guide {organizerName ? `· ${organizerName}` : ""}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Step {step + 1} of {STEPS.length} — this workspace is only yours
          </p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/20 text-sky-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-white">{s.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-neutral-300">{s.body}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full ${i === step ? "bg-sky-400" : "bg-white/15"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setStep((x) => x - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button size="sm" className="rounded-full bg-sky-500 text-white hover:bg-sky-400" onClick={() => setStep((x) => x + 1)}>
              Next
            </Button>
          ) : (
            <Button size="sm" className="rounded-full bg-sky-500 text-white hover:bg-sky-400" onClick={dismiss}>
              Got it
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
