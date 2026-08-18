import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { listOrganizerFollowers } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/org-followers/$id")({
  head: () => ({
    ...buildSeoHead({
      title: "Organizer followers — NepARENA",
      description: "People following this organizer",
      path: "/org-followers",
    }),
  }),
  component: OrgFollowersPage,
});

function OrgFollowersPage() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data: organizer } = useQuery({
    queryKey: ["org_followers_header", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizers")
        .select("id, name, slug, logo_url")
        .eq("id", id)
        .maybeSingle();
      return data as { id: string; name: string; slug: string; logo_url: string | null } | null;
    },
  });

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["org_followers_list", id],
    queryFn: () => listOrganizerFollowers(id, 120),
    enabled: !!id,
  });

  const name = organizer?.name?.trim() || "Organizer";

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <button
          type="button"
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
          onClick={() => {
            if (window.history.length > 1) router.history.back();
            else if (organizer?.slug) void router.navigate({ to: "/o/$slug", params: { slug: organizer.slug } });
            else void router.navigate({ to: "/organizers" });
          }}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <Users className="h-5 w-5 text-neutral-400" />
          Followers
        </h1>
        <p className="mt-1 text-sm text-neutral-500">People following {name}</p>

        <div className="mt-6 space-y-1 rounded-2xl border border-white/10 bg-white/[0.02]">
          {isLoading && (
            <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>
          )}
          {!isLoading && people.length === 0 && (
            <p className="p-6 text-center text-sm text-neutral-500">No followers yet</p>
          )}
          {people.map((u) => (
            <Link
              key={u.id}
              to="/members/$id"
              params={{ id: u.id }}
              className="flex items-center gap-3 px-3 py-3 transition hover:bg-white/[0.04]"
            >
              <Avatar className="h-11 w-11">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(u.full_name || u.username || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {u.full_name || u.username || "Player"}
                </p>
                {u.username && (
                  <p className="truncate text-xs text-neutral-500">@{u.username}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
