/**
 * Top bar — compact on phone, roomier on tablet/desktop.
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
          "sticky top-0 z-40 border-b border-border/80 bg-background/90 text-foreground backdrop-blur-xl",
          className,
        )}
      >
        <div className="mx-auto flex h-12 max-w-md items-center justify-between px-3 sm:h-14 sm:max-w-2xl sm:px-4 md:max-w-3xl lg:max-w-5xl lg:px-6">
          <div className="relative flex min-w-[2.75rem] items-center justify-start gap-1">
            {showActions && user ? (
              <button
                type="button"
                onClick={openCreate}
                className="grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition hover:bg-muted active:scale-95 sm:h-10 sm:w-10"
                aria-label="Create post"
                data-onboard="create-post"
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
                    src="/neparena-logo-ui.png"
                    alt=""
                    className="h-8 w-8 rounded-xl object-contain shadow-sm ring-1 ring-border sm:h-9 sm:w-9"
                    onError={(e) => {
                      e.currentTarget.src = "/pwa-192x192.png";
                    }}
                  />
                  <span className="text-[16px] font-bold tracking-tight text-foreground sm:text-lg">
                    {PLATFORM_NAME}
                  </span>
                </Link>
                <InstallTopButton />
              </>
            ) : pageTitle ? (
              <h1 className="truncate text-[15px] font-semibold text-foreground sm:text-base">
                {pageTitle}
              </h1>
            ) : null}
          </div>

          <div className="flex min-w-[2.75rem] justify-end">
            {showActions && user ? (
              <span data-onboard="notifications" className="inline-flex">
                <NotificationsBell />
              </span>
            ) : (
              <span className="w-9" />
            )}
          </div>
        </div>
      </header>
      {!onCreatePost && showActions && (
        <CreatePostModal open={postModalOpen} onOpenChange={setPostModalOpen} />
      )}
    </>
  );
}
