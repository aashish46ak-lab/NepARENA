/**
 * /profile — opens the social profile (same as before):
 * logged-in → /members/:id (followers, posts, edit)
 * guest → sign-in prompt
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Profile — NepARENA" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.id) {
      void router.navigate({
        to: "/members/$id",
        params: { id: user.id },
        replace: true,
      });
    }
  }, [loading, user?.id, router]);

  if (loading || user) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 pb-28 pt-3">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#121214]/90 shadow-2xl ring-1 ring-white/5">
          <div className="relative h-32 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black sm:h-40">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
          <div className="relative px-4 pb-8">
            <div className="-mt-12 h-24 w-24 rounded-full bg-neutral-800 ring-4 ring-[#121214]" />
            <h1 className="mt-3 text-xl font-bold text-white">Guest</h1>
            <p className="text-sm text-neutral-500">Sign in to unlock your profile</p>
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-neutral-400">
              <span>
                <strong className="text-white">0</strong> followers
              </span>
              <span>
                <strong className="text-white">0</strong> following
              </span>
              <span>
                <strong className="text-white">0</strong> posts
              </span>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-center text-sm text-neutral-400">
                Create an account or sign in to post, follow organizers, and chat.
              </p>
              <Button
                asChild
                className="w-full max-w-xs rounded-full bg-sky-500 text-white hover:bg-sky-400"
              >
                <Link to="/auth">Sign In / Register</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
