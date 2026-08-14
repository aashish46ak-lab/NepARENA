/**
 * Instagram-style top bar.
 * Home: logo + Install + notifications + create.
 * Other pages: title only.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsBell } from "@/components/NotificationsBell";
import { InstallTopButton } from "@/components/InstallFAB";
import { PLATFORM_NAME } from "@/lib/organizers";
import { cn } from "@/lib/utils";
import { CreatePostModal } from "@/components/CreatePostModal";

type Props = {
  onCreatePost?: () => void;
  className?: string;
  showLogo?: boolean;
  pageTitle?: string;
};

export function PlatformTopBar({ onCreatePost, className, showLogo, pageTitle }: Props) {
  const { user } = useAuth();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/" || pathname === "";
  const displayLogo = showLogo ?? isHome;
  const showActions = isHome;

  const openCreate = () => {
    if (onCreatePost) onCreatePost();
    else setPostModalOpen(true);
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl",
          className,
        )}
      >
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-3">
          <div className="relative flex min-w-[2.75rem] items-center justify-start gap-1">
            {showActions && user ? (
              <button
                type="button"
                onClick={openCreate}
                className="grid h-9 w-9 place-items-center rounded-full text-neutral-200 transition hover:bg-white/10 active:scale-95"
                aria-label="Create post"
                data-tour="create-btn"
              >
                <Plus className="h-6 w-6" strokeWidth={1.75} />
              </button>
            ) : (
              <span className="w-9" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {displayLogo ? (
              <>
                <Link to="/" className="flex items-center gap-2">
                  <img
                    src="/neparena-logo.png"
                    alt=""
                    className="h-8 w-8 rounded-xl object-contain shadow-sm ring-1 ring-white/10"
                    onError={(e) => {
                      e.currentTarget.src = "/pwa-192x192.png";
                    }}
                  />
                  <span className="text-[16px] font-bold tracking-tight text-white">{PLATFORM_NAME}</span>
                </Link>
                <InstallTopButton />
              </>
            ) : pageTitle ? (
              <h1 className="truncate text-[15px] font-semibold text-white">{pageTitle}</h1>
            ) : null}
          </div>

          <div className="flex min-w-[2.75rem] justify-end">
            {showActions && user ? <NotificationsBell /> : <span className="w-9" />}
          </div>
        </div>
      </header>
      {!onCreatePost && showActions && (
        <CreatePostModal open={postModalOpen} onOpenChange={setPostModalOpen} />
      )}
    </>
  );
}
