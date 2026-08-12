import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdminEmail } from "@/lib/organizers";
import { PageShell } from "@/components/PageShell";
import { Loader2, Shield } from "lucide-react";
import type { ReactNode } from "react";

type Mode = "auth" | "admin" | "superadmin";

/**
 * Route gate for sensitive UI.
 * Note: UI gates are NOT sufficient alone — RLS/RPC must enforce on the server.
 */
export function RequireAccess({
  mode,
  children,
}: {
  mode: Mode;
  children: ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <PageShell>
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Sign in required</h1>
          <Link to="/auth" className="mt-4 inline-block text-sm text-brand">
            Go to sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  if (mode === "superadmin" && !isSuperAdminEmail(user.email)) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-brand">
            Back home
          </Link>
        </div>
      </PageShell>
    );
  }

  if (mode === "admin" && !isAdmin && !isSuperAdminEmail(user.email)) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Admin access only</h1>
          <Link to="/" className="mt-4 inline-block text-sm text-brand">
            Back home
          </Link>
        </div>
      </PageShell>
    );
  }

  return <>{children}</>;
}
