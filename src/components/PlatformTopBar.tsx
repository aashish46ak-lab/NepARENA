import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Megaphone, BarChart3, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsBell } from "@/components/NotificationsBell";
import { PLATFORM_NAME, isSuperAdminEmail } from "@/lib/organizers";
import { cn } from "@/lib/utils";

type Props = {
  onCreatePost?: () => void;
  className?: string;
  /** When true (default on home), show centered logo+title. On other pages show pageTitle instead. */
  showLogo?: boolean;
  pageTitle?: string;
};

export function PlatformTopBar({ onCreatePost, className, showLogo, pageTitle }: Props) {
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const [createOpen, setCreateOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/" || pathname === "";
  const displayLogo = showLogo ?? isHome;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-3">
        <div className="relative flex w-12 justify-start">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setCreateOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full text-neutral-200 transition hover:bg-white/10"
                aria-label="Create"
                data-tour="create-btn"
              >
                <Plus className="h-6 w-6" strokeWidth={1.75} />
              </button>
              {createOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40"
                    aria-label="Close create menu"
                    onClick={() => setCreateOpen(false)}
                  />
                  <div className="absolute left-0 top-11 z-50 min-w-[200px] overflow-hidden rounded-2xl border border-white/12 bg-[#141416]/98 py-1.5 shadow-2xl backdrop-blur-xl">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8"
                      onClick={() => {
                        setCreateOpen(false);
                        onCreatePost?.();
                        if (!onCreatePost) window.location.href = "/feed";
                      }}
                    >
                      <FileText className="h-4 w-4 text-sky-400" />
                      Create Post
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-500"
                      disabled
                      title="Coming soon"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Create Poll
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-neutral-600">Soon</span>
                    </button>
                    {(isAdmin || isSuperAdmin) && (
                      <Link
                        to={isSuperAdmin ? "/platform" : "/dashboard"}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8"
                        onClick={() => setCreateOpen(false)}
                      >
                        <Megaphone className="h-4 w-4 text-amber-400" />
                        Announcement
                      </Link>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <Link
              to="/auth"
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-white/10"
              aria-label="Sign in to create"
            >
              <Plus className="h-6 w-6" strokeWidth={1.75} />
            </Link>
          )}
        </div>

        {displayLogo ? (
          <Link to="/" className="flex items-center gap-2" data-tour="logo">
            <img
              src="/neparena-logo.png"
              alt=""
              className="h-8 w-8 rounded-xl object-cover ring-1 ring-white/20"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192x192.png";
              }}
            />
            <span className="text-[17px] font-semibold tracking-tight text-white">{PLATFORM_NAME}</span>
          </Link>
        ) : (
          <span className="text-[15px] font-semibold tracking-tight text-white">
            {pageTitle ?? ""}
          </span>
        )}

        <div className="flex w-12 justify-end" data-tour="notifications">
          {user ? (
            <NotificationsBell />
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-black"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
