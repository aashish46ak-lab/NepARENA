/**
 * Pre-launch gate — until 10 Sep 2026 10:00 NPT only platform admins see the app.
 * Others get a blurred backdrop + countdown; after launch, a Get Started CTA unlocks UX.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdminEmail, PLATFORM_NAME } from "@/lib/organizers";
import { OWNER_EMAIL } from "@/lib/supabase";

/** 10 September 2026, 10:00 AM Nepal Time (UTC+05:45) → 04:15 UTC */
export const LAUNCH_AT_MS = Date.UTC(2026, 8, 10, 4, 15, 0);

const STORAGE_KEY = "neparena_launch_entered_v1";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function useNow(tickMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

type Parts = { days: number; hours: number; mins: number; secs: number; total: number };

function splitRemaining(ms: number): Parts {
  const total = Math.max(0, ms);
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const mins = Math.floor((total % 3_600_000) / 60_000);
  const secs = Math.floor((total % 60_000) / 1_000);
  return { days, hours, mins, secs, total };
}

function Unit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[4.25rem] flex-1 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:min-w-[5rem] sm:px-3 sm:py-3.5">
      <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">
        {value}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
    </div>
  );
}

export function LaunchGate({ children }: { children: React.ReactNode }) {
  const { user, isOwner, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const now = useNow(250);
  const remaining = useMemo(() => splitRemaining(LAUNCH_AT_MS - now), [now]);
  const launched = remaining.total <= 0;

  const [entered, setEntered] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const isPlatformAdmin =
    isSuperAdminEmail(user?.email) ||
    isOwner ||
    user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  // Admins always pass; after launch + Get Started, everyone passes
  // Auth routes stay reachable so platform admins can sign in
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
  const unlocked = isPlatformAdmin || (launched && entered) || isAuthRoute;

  const handleEnter = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setEntered(true);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#050507]">
      {/* Ambient background (blurred preview) */}
      <div
        className="pointer-events-none absolute inset-0 scale-110 opacity-60 blur-2xl"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(56,189,248,0.22),transparent_50%),radial-gradient(ellipse_at_80%_30%,rgba(229,184,0,0.12),transparent_45%),radial-gradient(ellipse_at_50%_90%,rgba(34,197,94,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[url('/icon-192.png')] bg-center bg-no-repeat opacity-[0.07] [background-size:min(70vw,28rem)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-xl" aria-hidden />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src="/icon-192.png"
              alt={PLATFORM_NAME}
              width={72}
              height={72}
              className="h-[4.5rem] w-[4.5rem] rounded-2xl object-contain shadow-2xl ring-1 ring-white/15"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192x192.png";
              }}
            />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-300/90">
              Official opening
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {PLATFORM_NAME}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
              Multi-organizer esports platform for Nepal & beyond. We open{" "}
              <span className="font-medium text-neutral-200">10 Sep 2026 · 10:00 AM NPT</span>.
            </p>
          </div>

          <div className="rounded-3xl border border-white/12 bg-[#0c0c10]/85 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            {!launched ? (
              <>
                <p className="text-center text-xs font-medium text-neutral-400">
                  Launching in
                </p>
                <div className="mt-4 flex gap-2 sm:gap-2.5">
                  <Unit label="Days" value={pad(remaining.days)} />
                  <Unit label="Hours" value={pad(remaining.hours)} />
                  <Unit label="Mins" value={pad(remaining.mins)} />
                  <Unit label="Secs" value={pad(remaining.secs)} />
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-[width] duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, 100 - (remaining.total / (30 * 86_400_000)) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-4 text-center text-[11px] leading-relaxed text-neutral-500">
                  The platform is in private prep. Only platform admins can enter until the
                  countdown ends.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                  <span className="text-2xl" aria-hidden>
                    ✓
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">We're live</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    NepARENA is open. Tap below to enter the platform.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnter}
                  className="mt-1 w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black shadow-lg transition hover:bg-neutral-100 active:scale-[0.98]"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>

          {!isPlatformAdmin && (
            <p className="mt-6 text-center text-[11px] text-neutral-500">
              Platform admin?{" "}
              <Link
                to="/auth"
                className="font-medium text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
              >
                Sign in
              </Link>
              {loading ? " · checking session…" : null}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
