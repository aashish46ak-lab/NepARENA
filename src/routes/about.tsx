import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useOwnerInfo, useModerators } from "@/hooks/useContent";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Shield, Mail } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — eFootball Nepal" }, { name: "description", content: "About eFootball Nepal, its ownership, and the moderator team." }] }),
  component: () => {
    const settings = useSiteSettings();
    const { data: owner } = useOwnerInfo();
    const { data: mods = [] } = useModerators();
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">About eFootball Nepal</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">{settings?.about_short ?? "eFootball Nepal is the official platform organizing competitive eFootball tournaments and community events across Nepal."}</p>
          </div>
          {owner && (
            <div className="glass rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 text-brand-glow text-xs uppercase tracking-widest"><Crown className="h-4 w-4" /> Ownership</div>
              <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-28 w-28 ring-2 ring-brand/40"><AvatarImage src={owner.photo_url ?? undefined} /><AvatarFallback className="bg-gradient-brand text-primary-foreground text-lg">{owner.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-sm text-muted-foreground">{owner.title}</div>
                  <h2 className="text-2xl font-bold">{owner.name}</h2>
                  <p className="mt-2 text-muted-foreground">{owner.bio}</p>
                  {owner.email && <div className="mt-3 text-sm inline-flex items-center gap-1 text-brand-glow"><Mail className="h-3 w-3" /> {owner.email}</div>}
                </div>
              </div>
            </div>
          )}
          {mods.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-brand-glow text-xs uppercase tracking-widest mb-4"><Shield className="h-4 w-4" /> Moderators</div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {mods.map((m) => (
                  <div key={m.id} className="glass rounded-2xl p-5 text-center">
                    <Avatar className="h-20 w-20 mx-auto ring-2 ring-brand/40"><AvatarImage src={m.photo_url ?? undefined} /><AvatarFallback className="bg-gradient-brand text-primary-foreground">{m.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <h3 className="mt-3 font-semibold">{m.name}</h3>
                    <div className="text-xs text-brand-glow">{m.role_title}</div>
                    {m.bio && <p className="mt-2 text-xs text-muted-foreground">{m.bio}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageShell>
    );
  },
});
