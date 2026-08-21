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
        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-x-4 gap-y-2 px-4 pt-6 text-xs text-neutral-400">
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/rules" className="hover:text-white">Rules</Link>
          <Link to="/news" className="hover:text-white">News</Link>
          <Link to="/guides" className="hover:text-white">Guides</Link>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <Link to="/ownership" className="hover:text-white">Contact</Link>
          <a href="/ads.txt" className="hover:text-white">Ads</a>
        </div>
        <div className="py-4 text-center text-xs text-neutral-500">
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
              <Link to="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground">
                About NepARENA
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">Community</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {activeLinks.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground"
                  onClick={() => track(l.id)}
                >
                  <PlatformIcon platform={l.platform} className="h-4 w-4" />
                  {l.label || l.platform}
                </a>
              </li>
            ))}
            {!activeLinks.length && <li className="text-xs">No links yet</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <Link to="/" className="hover:text-foreground">
          {PLATFORM_NAME}
        </Link>
        ·{" "}
        <Link to="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        ·{" "}
        <Link to="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </div>
    </footer>
  );
}
