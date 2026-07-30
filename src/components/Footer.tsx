import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCommunityLinks } from "@/hooks/useContent";
import { PlatformIcon } from "@/lib/platforms";

export function Footer() {
  const settings = useSiteSettings();
  const links = useCommunityLinks();
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="font-bold text-gradient-brand text-lg">{settings?.site_name ?? "eFootball Nepal"}</div>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            {settings?.tagline ?? "The official home of competitive eFootball in Nepal."}
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Explore</div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/tournaments" className="hover:text-foreground">Tournaments</Link></li>
            <li><Link to="/hall-of-fame" className="hover:text-foreground">Hall of Fame</Link></li>
            <li><Link to="/history" className="hover:text-foreground">Tournament History</Link></li>
            <li><Link to="/gallery" className="hover:text-foreground">Gallery</Link></li>
            <li><Link to="/members" className="hover:text-foreground">Members</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Community</div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {(links ?? []).map((l) => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground">
                  <PlatformIcon platform={l.platform} className="h-4 w-4" /> {l.label}
                </a>
              </li>
            ))}
            {(!links || links.length === 0) && <li className="opacity-60">Community links coming soon</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        {settings?.footer_text ?? `© ${new Date().getFullYear()} eFootball Nepal. All rights reserved.`}
      </div>
    </footer>
  );
}