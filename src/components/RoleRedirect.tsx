import { useEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * After a successful sign-in, send each user to the home surface for their role.
 * Owner / moderator -> admin dashboard, everyone else -> their member dashboard.
 * Only runs on the auth screens or the landing page right after login, so normal
 * browsing is never hijacked.
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
    // Suspended accounts are signed out immediately, wherever they are.
    if (profile?.is_suspended) {
      toast.error("Your account has been suspended. Contact the admins for help.");
      signOut();
      return;
    }
    if (handled.current === user.id) return;
    const onAuthScreen = pathname === "/auth" || pathname.startsWith("/auth/");
    if (!onAuthScreen) return;
    handled.current = user.id;
    router.navigate({ to: isAdmin ? "/dashboard" : "/profile", replace: true });
  }, [loading, user, isAdmin, profile, pathname, router, signOut]);

  return null;
}