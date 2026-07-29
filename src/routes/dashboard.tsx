import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2 } from "lucide-react";
import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";
import { TournamentsPanel } from "@/components/admin/TournamentsPanel";
import { AnnouncementsPanel } from "@/components/admin/AnnouncementsPanel";
import { HallOfFamePanel } from "@/components/admin/HallOfFamePanel";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { GalleryPanel } from "@/components/admin/GalleryPanel";
import { SponsorsPanel } from "@/components/admin/SponsorsPanel";
import { CommunityLinksPanel } from "@/components/admin/CommunityLinksPanel";
import { OwnerModeratorsPanel } from "@/components/admin/OwnerModeratorsPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { ProfilePanel } from "@/components/admin/ProfilePanel";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — eFootball Nepal" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading, isAdmin, isOwner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <PageShell>
        <div className="min-h-[60vh] grid place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="glass rounded-2xl p-10">
            <Shield className="h-10 w-10 text-brand mx-auto" />
            <h1 className="mt-4 text-2xl font-bold">Admins only</h1>
            <p className="mt-2 text-muted-foreground">This area is restricted to eFootball Nepal moderators and owner.</p>
            <Link to="/" className="mt-4 inline-block text-brand-glow hover:underline">Back to home</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center glow-brand"><Shield className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin dashboard</h1>
            <div className="text-xs text-muted-foreground">Signed in as {user.email} · {isOwner ? "Owner" : "Moderator"}</div>
          </div>
        </div>
        <Tabs defaultValue="site" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="glass flex w-max">
              <TabsTrigger value="site">Site</TabsTrigger>
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="hof">Hall of Fame</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
              <TabsTrigger value="team">Owner &amp; Moderators</TabsTrigger>
              {isOwner && <TabsTrigger value="users">Users &amp; roles</TabsTrigger>}
              <TabsTrigger value="profile">My profile</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="site" className="mt-6"><SiteSettingsPanel /></TabsContent>
          <TabsContent value="tournaments" className="mt-6"><TournamentsPanel /></TabsContent>
          <TabsContent value="announcements" className="mt-6"><AnnouncementsPanel /></TabsContent>
          <TabsContent value="hof" className="mt-6"><HallOfFamePanel /></TabsContent>
          <TabsContent value="history" className="mt-6"><HistoryPanel /></TabsContent>
          <TabsContent value="gallery" className="mt-6"><GalleryPanel /></TabsContent>
          <TabsContent value="sponsors" className="mt-6"><SponsorsPanel /></TabsContent>
          <TabsContent value="community" className="mt-6"><CommunityLinksPanel /></TabsContent>
          <TabsContent value="team" className="mt-6"><OwnerModeratorsPanel /></TabsContent>
          {isOwner && <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>}
          <TabsContent value="profile" className="mt-6"><ProfilePanel /></TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}