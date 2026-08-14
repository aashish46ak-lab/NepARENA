import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, type CommunityLink } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PlatformIcon } from "@/lib/platforms";
import { PLATFORM_NAME } from "@/lib/organizers";

export function Footer({ mode = "organizer" }: { mode?: "platform" | "organizer" }) {
  if (mode === "platform") {
    return (
      <footer className="mt-16 border-t border-white/10">
        <div className="py-6 text-center text-xs text-neutral-500">
          © {PLATFORM_NAME}. All Rights Reserved.
        </div>
      </footer>
    );
  }
  return <OrganizerFooter />;
}

function OrganizerFooter() {
  const settings = useSiteSettings();
  const { data: links } = useQuery({
    queryKey: ["community_links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_links")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as CommunityLink[];
    },
  });

  const track = (id: string) => {
    void supabase.rpc("increment_community_click", { _id: id });
  };

  const activeLinks = links ?? [];

  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="text-lg font-bold text-gradient-brand">
            {settings?.site_name ?? "Organizer"}
          </div>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {settings?.tagline ?? "Competitive esports community."}
          </p>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">Explore</div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link to="/tournaments" className="hover:text-foreground">
                Tournaments
              </Link>
            </li>
            <li>
              <Link to="/hall-of-fame" className="hover:text-foreground">
                Hall of Fame
              </Link>
            </li>
            <li>
              <Link to="/history" className="hover:text-foreground">
                Tournament History
              </Link>
            </li>
            <li>
              <Link to="/gallery" className="hover:text-foreground">
                Gallery
              </Link>
            </li>
            <li>
              <Link to="/members" className="hover:text-foreground">
                Members
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">Community</div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {activeLinks.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track(l.id)}
                  className="inline-flex items-center gap-2 hover:text-foreground"
                >
                  <PlatformIcon platform={l.platform} className="h-4 w-4" /> {l.label}
                </a>
              </li>
            ))}
            {activeLinks.length === 0 && (
              <li className="opacity-60">No community links yet</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        {settings?.footer_text ??
          `© ${new Date().getFullYear()} ${settings?.site_name ?? "Organizer"}. All rights reserved.`}
      </div>
    </footer>
  );
}
