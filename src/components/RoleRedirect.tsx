import { useEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  ensureEfootballNepalAdmin,
  isSuperAdminEmail,
} from "@/lib/organizers";
import { getOrganizerContext } from "@/lib/organizer-context";
import { toast } from "sonner";

/**
 * After sign-in:
 * - Super admins → always /platform (never linger on public home)
 * - Organizer admin → /dashboard
 * - Member with org context → /o/$slug
 * - Member → /profile
 */
export function RoleRedirect() {
  const { user, loading, isAdmin, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) {
      if (!user) handled.current = null;
      return;
    }
    if (profile?.is_suspended) {
      toast.error("Your account has been suspended.");
      void signOut();
      return;
    }

    if (isSuperAdminEmail(user.email)) {
      void ensureEfootballNepalAdmin(user.id);
      if (pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/")) {
        router.navigate({ to: "/platform", replace: true });
      }
      return;
    }

    if (handled.current === user.id) return;
    const onAuthScreen = pathname === "/auth" || pathname.startsWith("/auth/");
    if (!onAuthScreen) return;
    handled.current = user.id;

    const ctx = getOrganizerContext();
    if (ctx?.slug) {
      router.navigate({ to: "/o/$slug", params: { slug: ctx.slug }, replace: true });
      return;
    }
    router.navigate({ to: isAdmin ? "/dashboard" : "/profile", replace: true });
  }, [loading, user, isAdmin, profile, pathname, router, signOut]);

  return null;
}
