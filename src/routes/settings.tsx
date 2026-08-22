/**
 * User settings — account links (dark only).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft, User, LogOut, Sparkles } from "lucide-react";
import { requestOnboardingReplay, resetOnboarding } from "@/components/OnboardingTour";
import {
  listSavedAccounts,
  removeSavedAccount,
  type SavedAccount,
} from "@/lib/account-switcher";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    ...buildSeoHead({
      title: "Settings — NepARENA",
      description: "Account settings",
      path: "/settings",
    }),
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    setAccounts(listSavedAccounts());
  }, [user?.id]);

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Settings" />
      <div className="mx-auto max-w-lg space-y-6 px-4 pb-28 pt-4">
        <Link
          to={user ? "/members/$id" : "/"}
          params={user ? { id: user.id } : undefined}
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {user && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Account</h2>
            <div className="space-y-1">
              <Link
                to="/members/$id"
                params={{ id: user.id }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/[0.05]"
              >
                <User className="h-4 w-4 text-sky-400" /> View profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.href = "/";
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-white/[0.05]"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white">Accounts</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Switch accounts by signing out and signing in. Recently used accounts are listed for quick access.
          </p>
          <div className="mt-3 space-y-1">
            {accounts.length === 0 && (
              <p className="text-xs text-neutral-500">No saved accounts yet. Sign in once to appear here.</p>
            )}
            {accounts.map((a) => {
              const isCurrent = user?.id === a.id;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-xs font-bold">
                    {a.avatar ? (
                      <img src={a.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (a.name || a.email || "?")[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{a.name}</p>
                    <p className="truncate text-[11px] text-neutral-500">{a.email}</p>
                  </div>
                  {isCurrent ? (
                    <span className="text-[10px] font-semibold text-sky-400">Active</span>
                  ) : (
                    <button
                      type="button"
                      className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-white/10"
                      onClick={async () => {
                        await signOut();
                        window.location.href = `/auth?email=${encodeURIComponent(a.email)}`;
                      }}
                    >
                      Switch
                    </button>
                  )}
                  {!isCurrent && (
                    <button
                      type="button"
                      className="text-[11px] text-neutral-500 hover:text-rose-300"
                      onClick={() => {
                        removeSavedAccount(a.id);
                        setAccounts(listSavedAccounts());
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="mt-2 w-full rounded-full border border-dashed border-white/15 py-2 text-xs font-semibold text-neutral-300 hover:border-sky-400/40 hover:bg-sky-500/10"
              onClick={async () => {
                await signOut();
                window.location.href = "/auth";
              }}
            >
              Add another account
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white">Help</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Replay Arena Quest — tap glowing spots to collect stamps and rediscover Feed, Organizers, Cups, and Messages.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
            onClick={() => {
              resetOnboarding(user?.id);
              requestOnboardingReplay();
              toast.success("Starting Arena Quest…");
              window.location.href = "/";
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            Replay Arena Quest
          </button>
        </section>
      </div>
    </PageShell>
  );
}
