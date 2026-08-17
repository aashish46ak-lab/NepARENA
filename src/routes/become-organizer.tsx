/**
 * Become an Organizer — writes to organizer_requests (platform admin panel).
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
  Building2, Loader2, MessageCircle, CheckCircle2, Clock, XCircle, AlertCircle, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyPlatformAdmins } from "@/lib/organizers";

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
  id: string; org_name: string; contact_email: string; status: ReqStatus;
  admin_note: string | null; created_at: string;
};

const STATUS_UI: Record<ReqStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending review", icon: Clock, className: "text-amber-300 bg-amber-500/15" },
  approved: { label: "Approved", icon: CheckCircle2, className: "text-emerald-300 bg-emerald-500/15" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-rose-300 bg-rose-500/15" },
  changes_requested: { label: "Changes requested", icon: AlertCircle, className: "text-sky-300 bg-sky-500/15" },
};

const GAMES = [
  { id: "efootball", label: "eFootball", enabled: true },
  { id: "free_fire", label: "Free Fire", enabled: false },
  { id: "pubg", label: "PUBG Mobile", enabled: false },
  { id: "mlbb", label: "Mobile Legends", enabled: false },
  { id: "ea_fc", label: "EA SPORTS FC", enabled: false },
  { id: "other", label: "Other esports", enabled: false },
];

function BecomeOrganizerPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"info" | "form" | "status">("info");
  const [myReq, setMyReq] = useState<RequestRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [facebook, setFacebook] = useState("");
  const [country, setCountry] = useState("Nepal");
  const [game, setGame] = useState("efootball");

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data } = await supabase
        .from("organizer_requests")
        .select("id, org_name, contact_email, status, admin_note, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setMyReq(data as RequestRow);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  const submit = async () => {
    if (!user) return toast.message("Sign in to apply");
    if (!orgName.trim() || !email.trim()) return toast.error("Name and email required");
    if (!game) return toast.error("Select a game");
    if (game !== "efootball") return toast.error("Only eFootball applications are open right now");
    setBusy(true);
    try {
      const payload = {
        user_id: user.id,
        org_name: orgName.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
        description: description.trim() || null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        social_links: { facebook: facebook.trim() || null, country: country.trim() || null, game },
        status: "pending",
      };
      const { data, error } = await supabase
        .from("organizer_requests")
        .insert(payload)
        .select("id, org_name, contact_email, status, admin_note, created_at")
        .maybeSingle();
      if (error) throw error;
      setMyReq(data as RequestRow);
      setMode("status");
      try {
        await notifyPlatformAdmins({
          title: "New organizer application",
          body: `${orgName.trim()} applied (${game})`,
          link: "/platform",
          actorId: user.id,
        });
      } catch { /* non-blocking */ }
      toast.success("Application submitted — platform admin notified");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const StatusIcon = myReq ? STATUS_UI[myReq.status]?.icon ?? Clock : Clock;

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Become Organizer" />
      <div className="mx-auto max-w-lg px-4 pb-28 pt-4">
        <Link to="/organizers" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Organizers
        </Link>

        <div className="mb-4 flex gap-1 rounded-xl bg-white/[0.04] p-1">
          {(["info", "form", "status"] as const).map((id) => (
            <button key={id} type="button" onClick={() => setMode(id)}
              className={cn("flex-1 rounded-lg py-2 text-xs font-semibold capitalize", mode === id ? "bg-white/10 text-white" : "text-neutral-500")}>
              {id === "form" ? "Apply" : id}
            </button>
          ))}
        </div>

        {mode === "info" && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15">
                <Building2 className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Host on NepARENA</h1>
                <p className="text-sm text-neutral-400">Run tournaments for your game community</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li>• Currently open for eFootball organizers only</li>
              <li>• Platform admin reviews your application</li>
              <li>• After approval you get an organizer dashboard</li>
            </ul>
            <Button className="w-full bg-amber-500 text-black hover:bg-amber-400" onClick={() => setMode("form")}>
              Start application
            </Button>
            {myReq && (
              <button type="button" className="w-full text-center text-sm text-sky-400" onClick={() => setMode("status")}>View application status</button>
            )}
          </div>
        )}

        {mode === "form" && (
          <div className="space-y-4">
            <div>
              <Label className="text-neutral-400">Organization name</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
            </div>
            <div>
              <Label className="text-neutral-400">Contact email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
            </div>
            <div>
              <Label className="text-neutral-400">Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
            </div>
            <div>
              <Label className="mb-2 block text-neutral-400">Primary game</Label>
              <div className="grid grid-cols-2 gap-2">
                {GAMES.map((g) => (
                  <button key={g.id} type="button" disabled={!g.enabled} onClick={() => g.enabled && setGame(g.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                      !g.enabled && "cursor-not-allowed opacity-50",
                      g.enabled && game === g.id
                        ? "border-amber-400/50 bg-amber-500/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-neutral-300",
                    )}>
                    <span className="font-medium">{g.label}</span>
                    {!g.enabled && (
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-neutral-500">Coming Soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-neutral-400">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-neutral-400">Logo</Label>
                <ImageUpload value={logoUrl} onChange={setLogoUrl} folder="organizer-apps" aspect="square" />
              </div>
              <div>
                <Label className="text-neutral-400">Banner</Label>
                <ImageUpload value={bannerUrl} onChange={setBannerUrl} folder="organizer-apps" aspect="wide" />
              </div>
            </div>
            <div>
              <Label className="text-neutral-400">Facebook (optional)</Label>
              <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" placeholder="Page or profile URL" />
            </div>
            <div>
              <Label className="text-neutral-400">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 border-white/10 bg-white/[0.04]" />
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
                <RequestChatPanel requestId={myReq.id} />
              </>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function RequestChatPanel({ requestId }: { requestId: string }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<{ id: string; body: string; is_from_admin: boolean; created_at: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizer_request_messages")
      .select("id, body, is_from_admin, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setMsgs((data as typeof msgs) ?? []);
    setLoading(false);
    await supabase.from("organizer_request_messages").update({ read_by_applicant: true }).eq("request_id", requestId).eq("is_from_admin", true).eq("read_by_applicant", false);
  };

  useEffect(() => { void load(); }, [requestId]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setBusy(true);
    try {
      const body = text.trim();
      const { error } = await supabase.from("organizer_request_messages").insert({
        request_id: requestId, sender_id: user.id, is_from_admin: false, body, read_by_applicant: true, read_by_admin: false,
      });
      if (error) throw error;
      setText("");
      await load();
      try {
        await notifyPlatformAdmins({ title: "Organizer applicant message", body: body.slice(0, 120), link: "/platform", actorId: user.id });
      } catch { /* ignore */ }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
        <MessageCircle className="h-4 w-4 text-sky-400" /> Chat with Platform Admin
      </p>
      <div className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-black/30 p-2">
        {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-neutral-500" />}
        {!loading && !msgs.length && (
          <p className="py-4 text-center text-xs text-neutral-500">No messages yet. Ask anything about your application.</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.is_from_admin ? "mr-auto bg-white/10 text-neutral-100" : "ml-auto bg-sky-500/20 text-sky-50")}>
            <p>{m.body}</p>
            <p className="mt-1 text-[10px] text-neutral-500">{new Date(m.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" className="border-white/10 bg-white/[0.04]"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
        <Button size="sm" disabled={busy || !text.trim()} onClick={() => void send()} className="shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
        </Button>
      </div>
    </div>
  );
}
