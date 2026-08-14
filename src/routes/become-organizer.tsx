/**
 * Become an Organizer — dedicated onboarding + application form.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { buildSeoHead } from "@/lib/seo";
import { toast } from "sonner";
import {
  Building2,
  Loader2,
  MessageCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Trophy,
  Shield,
  Gamepad2,
  ArrowLeft,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/become-organizer")({
  head: () => ({
    ...buildSeoHead({
      title: "Become an Organizer — NepARENA",
      description: "Apply to run your own esports community on NepARENA.",
      path: "/become-organizer",
    }),
  }),
  component: BecomeOrganizerPage,
});

type ReqStatus = "pending" | "approved" | "rejected" | "changes_requested";
type RequestRow = {
  id: string;
  org_name: string;
  contact_email: string;
  status: ReqStatus;
  admin_note: string | null;
  created_at: string;
};

const STATUS_UI: Record<ReqStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending review", icon: Clock, className: "text-amber-300 bg-amber-500/15" },
  approved: { label: "Approved", icon: CheckCircle2, className: "text-emerald-300 bg-emerald-500/15" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-rose-300 bg-rose-500/15" },
  changes_requested: { label: "Changes requested", icon: AlertCircle, className: "text-sky-300 bg-sky-500/15" },
};

const GAMES = [
  { id: "efootball", label: "eFootball", available: true },
  { id: "pubg", label: "PUBG Mobile", available: false },
  { id: "freefire", label: "Free Fire", available: false },
  { id: "valorant", label: "Valorant", available: false },
  { id: "eafc", label: "EA FC", available: false },
  { id: "mlbb", label: "Mobile Legends", available: false },
  { id: "other", label: "Other esports", available: false },
];

function BecomeOrganizerPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"info" | "form" | "status">("info");
  const [busy, setBusy] = useState(false);
  const [myReq, setMyReq] = useState<RequestRow | null>(null);

  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [discord, setDiscord] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("Nepal");
  const [city, setCity] = useState("");
  const [game, setGame] = useState("efootball");

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data } = await supabase
        .from("organizer_applications")
        .select("id, org_name, contact_email, status, admin_note, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setMyReq(data as RequestRow);
    })();
  }, [user?.id]);

  const submit = async () => {
    if (!user) return toast.message("Sign in to apply");
    if (!orgName.trim() || !email.trim()) return toast.error("Name and email required");
    if (game !== "efootball") return toast.error("Only eFootball applications are open right now");
    setBusy(true);
    try {
      const payload = {
        user_id: user.id,
        org_name: orgName.trim(),
        contact_email: email.trim(),
        phone: phone.trim() || null,
        description: description.trim() || null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        facebook: facebook.trim() || null,
        instagram: instagram.trim() || null,
        discord: discord.trim() || null,
        website: website.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        game,
        status: "pending",
      };
      const { data, error } = await supabase
        .from("organizer_applications")
        .insert(payload)
        .select("id, org_name, contact_email, status, admin_note, created_at")
        .maybeSingle();
      if (error) throw error;
      setMyReq(data as RequestRow);
      setMode("status");
      toast.success("Application submitted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const StatusIcon = myReq ? STATUS_UI[myReq.status]?.icon ?? Clock : Clock;

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Become Organizer" />
      <div className="mx-auto max-w-lg px-4 pb-28 pt-4">
        <Link
          to="/organizers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Organizers
        </Link>

        <div className="mb-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(
            [
              ["info", "About"],
              ["form", "Apply"],
              ["status", "Status"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "flex-1 rounded-full py-2 text-xs font-semibold transition",
                mode === id ? "bg-white/10 text-white" : "text-neutral-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "info" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" />
                <h1 className="text-lg font-semibold text-white">Run your community on NepARENA</h1>
              </div>
              <p className="text-sm leading-relaxed text-neutral-400">
                Verified organizers get their own branded space, tournaments, fixtures, standings,
                and member tools — while players discover you from the main platform.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                { icon: Trophy, t: "Tournaments & fixtures", d: "Create cups, leagues, and matchdays." },
                { icon: Shield, t: "Verification", d: "Platform review before you go live." },
                { icon: Gamepad2, t: "Game focus", d: "eFootball is live; more titles soon." },
                { icon: Star, t: "Discoverability", d: "Appear in Organizers and the feed." },
              ].map((x) => (
                <div key={x.t} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <x.icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">{x.t}</p>
                    <p className="text-xs text-neutral-500">{x.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Games</p>
              <div className="flex flex-wrap gap-2">
                {GAMES.map((g) => (
                  <span
                    key={g.id}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      g.available
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/5 text-neutral-500",
                    )}
                  >
                    {g.available ? "✅ " : "Soon · "}{g.label}
                  </span>
                ))}
              </div>
            </div>
            <Button className="w-full bg-amber-500 text-black hover:bg-amber-400" onClick={() => setMode("form")}>
              Start application
            </Button>
          </div>
        )}

        {mode === "form" && (
          <div className="space-y-4">
            <div>
              <Label className="text-neutral-400">Tournament / Game</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    disabled={!g.available}
                    onClick={() => g.available && setGame(g.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      game === g.id
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                        : g.available
                          ? "border-white/12 text-neutral-300"
                          : "cursor-not-allowed border-white/5 text-neutral-600",
                    )}
                  >
                    {g.label}{!g.available && " (soon)"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-neutral-400">Organizer Name *</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-neutral-400">Logo</Label>
                <div className="mt-1"><ImageUpload value={logoUrl} onChange={setLogoUrl} folder="organizers" /></div>
              </div>
              <div>
                <Label className="text-neutral-400">Banner</Label>
                <div className="mt-1"><ImageUpload value={bannerUrl} onChange={setBannerUrl} folder="organizers" /></div>
              </div>
            </div>
            <div>
              <Label className="text-neutral-400">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[100px] border-white/10 bg-white/[0.04]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-neutral-400">Email *</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
              <div>
                <Label className="text-neutral-400">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-neutral-400">Facebook</Label>
                <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
              <div>
                <Label className="text-neutral-400">Instagram</Label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
              <div>
                <Label className="text-neutral-400">Discord</Label>
                <Input value={discord} onChange={(e) => setDiscord(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
              <div>
                <Label className="text-neutral-400">Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
              <div>
                <Label className="text-neutral-400">Country</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
              <div>
                <Label className="text-neutral-400">City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
              </div>
            </div>
            <Button className="w-full bg-amber-500 text-black hover:bg-amber-400" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
            </Button>
          </div>
        )}

        {mode === "status" && (
          <div className="space-y-4">
            {!myReq ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-neutral-500">
                No application yet. Switch to Apply to submit one.
              </p>
            ) : (
              <>
                <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold", STATUS_UI[myReq.status]?.className)}>
                  <StatusIcon className="h-4 w-4" />
                  {STATUS_UI[myReq.status]?.label ?? myReq.status}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">{myReq.org_name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{myReq.contact_email}</p>
                  <p className="mt-2 text-xs text-neutral-500">Submitted {new Date(myReq.created_at).toLocaleString()}</p>
                  {myReq.admin_note && (
                    <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-sm text-neutral-300">{myReq.admin_note}</p>
                  )}
                </div>
                <Link
                  to="/messages"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100"
                >
                  <MessageCircle className="h-4 w-4" /> Chat with Platform Admin
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
