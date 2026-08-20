/**
 * Platform users directory — all registered profiles.
 * Not the same as organizer_followers or user_follows.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { buildSeoHead } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { PLATFORM_NAME } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Users } from "lucide-react";

export const Route = createFileRoute("/users")({
  head: () => ({
    ...buildSeoHead({
      title: "Users",
      description:
        "Registered players and members on NepARENA — a global multi-organizer esports community.",
      path: "/users",
    }),
  }),
  component: PlatformUsersPage,
});

function PlatformUsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["platform_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.warn(error.message);
        return [];
      }
      return (data ?? []) as {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
        created_at: string;
      }[];
    },
  });

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" /> Users
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Registered players on {PLATFORM_NAME}. Open a profile to follow them.
        </p>
        {isLoading && (
          <p className="mt-8 text-sm text-neutral-500">Loading…</p>
        )}
        <ul className="mt-8 divide-y divide-white/5 rounded-2xl border border-white/10">
          {users.map((u) => {
            const label = u.full_name || u.username || "Player";
            return (
              <li key={u.id}>
                <Link
                  to="/members/$id"
                  params={{ id: u.id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]"
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-800 text-xs font-semibold">
                      {label.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{label}</p>
                    <p className="truncate text-xs text-neutral-500">
                      @{u.username ?? "user"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        {!isLoading && users.length === 0 && (
          <p className="mt-6 text-sm text-neutral-500">No users yet.</p>
        )}
      </div>
    </PageShell>
  );
}
