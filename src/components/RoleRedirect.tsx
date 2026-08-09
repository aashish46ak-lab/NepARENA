import { useEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdminEmail } from "@/lib/organizers";
import { toast } from "sonner";

/**
 * After sign-in on auth screens only:
 * Super Admin → /platform
 * Organizer admin/mod → /dashboard (existing reusable template)
 * Member → /profile
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
      toast.error("Your account has been suspended. Contact the admins for help.");
      signOut();
      return;
    }
    if (handled.current === user.id) return;
    const onAuthScreen = pathname === "/auth" || pathname.startsWith("/auth/");
    if (!onAuthScreen) return;
    handled.current = user.id;

    if (isSuperAdminEmail(user.email)) {
      router.navigate({ to: "/platform", replace: true });
      return;
    }
    router.navigate({ to: isAdmin ? "/dashboard" : "/profile", replace: true });
  }, [loading, user, isAdmin, profile, pathname, router, signOut]);

  return null;
}
