import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { THEME_PRESETS, type ThemeId } from "@/lib/themes";
import { toast } from "sonner";
import {
  Building2,
  Loader2,
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReqStatus = "pending" | "approved" | "rejected" | "changes_requested";

type RequestRow = {
  id: string;
  org_name: string;
  contact_email: string;
  status: ReqStatus;
  admin_note: string | null;
  created_at: string;
  logo_url: string | null;
  banner_url: string | null;
};

type Msg = {
  id: string;
  body: string;
  is_from_admin: boolean;
  created_at: string;
};

const STATUS_UI: Record<
  ReqStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: {
    label: "Pending review",
    icon: Clock,
    className: "text-amber-300 bg-amber-500/15",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "text-emerald-300 bg-emerald-500/15",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "text-rose-300 bg-rose-500/15",
  },
  changes_requested: {
    label: "Changes requested",
    icon: AlertCircle,
    className: "text-sky-300 bg-sky-500/15",
  },
};

export function BeAnOrganizer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"form" | "status">("form");
  const [busy, setBusy] = useState(false);
  const [myReq, setMyReq] = useState<RequestRow | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("midnight-blue");

  const loadMine = async () => {
    if (!user) {
      setMyReq(null);
      return;
    }
    const { data } = await supabase
      .from("organizer_requests")
      .select(
        "id, org_name, contact_email, status, admin_note, created_at, logo_url, banner_url",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setMyReq((data as RequestRow) ?? null);
    if (data) setMode("status");
  };

  const loadMsgs = async (requestId: string) => {
    const { data } = await supabase
      .from("organizer_request_messages")
      .select("id, body, is_from_admin, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMsgs((data as Msg[]) ?? []);
    await supabase
      .from("organizer_request_messages")
      .update({ read_by_applicant: true })
      .eq("request_id", requestId)
      .eq("is_from_admin", true)
      .eq("read_by_applicant", false);
  };

  useEffect(() => {
    void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (myReq && mode === "status") void loadMsgs(myReq.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myReq?.id, mode]);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  const submit = async () => {
    if (!user) {
      toast.message("Sign in to apply",
        {
          action: {
            label: "Sign in",
            onClick: () => {
              window.location.href = "/auth/";
            },
          },
        },
      );
      return;
    }
    const name = orgName.trim();
    const mail = email.trim().toLowerCase();
    if (!name || !mail) {
      toast.error("Organization name and Gmail are required");
      return;
    }
    setBusy(true);
    try {
      const preset = THEME_PRESETS.find((t) => t.id === themeId);
      const { error } = await supabase.from("organizer_requests").insert({
        user_id: user.id,
        org_name: name,
        contact_name: contactName.trim() || null,
        contact_email: mail,
        contact_phone: phone.trim() || null,
        logo_url: logo,
        banner_url: banner,
        theme_id: themeId,
        primary_color: preset?.swatch[0] ?? null,
        secondary_color: preset?.swatch[1] ?? null,
        description: description.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Application submitted");
      await loadMine();
      setMode("status");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const sendMsg = async () => {
    if (!user || !myReq || !text.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("organizer_request_messages").insert({
        request_id: myReq.id,
        sender_id: user.id,
        is_from_admin: false,
        body: text.trim(),
        read_by_applicant: true,
        read_by_admin: false,
      });
      if (error) throw error;
      setText("");
      await loadMsgs(myReq.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-black">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-50">Be an Organizer</h2>
                <p className="mt-0.5 text-sm text-neutral-400">
                  Run tournaments on NepARENA — apply with logo, banner & theme.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {myReq && (
                <Button
                  variant="outline"
                  className="border-white/15"
                  onClick={() => {
                    setOpen(true);
                    setMode("status");
                  }}
                >
                  Live status
                </Button>
              )}
              <Button
                className="bg-neutral-100 text-black hover:bg-white"
                onClick={() => {
                  setOpen(true);
                  setMode(myReq ? "status" : "form");
                }}
              >
                {myReq ? "Open panel" : "Apply now"}
              </Button>
            </div>
          </div>

          {myReq && (
            <div className="mt-4">
              {(() => {
                const s = STATUS_UI[myReq.status] ?? STATUS_UI.pending;
                const Icon = s.icon;
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                      s.className,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label} · {myReq.org_name}
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    mode === "form" ? "bg-white text-black" : "text-neutral-400",
                  )}
                  onClick={() => setMode("form")}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    mode === "status" ? "bg-white text-black" : "text-neutral-400",
                  )}
                  onClick={() => setMode("status")}
                  disabled={!myReq}
                >
                  Status & chat
                </button>
              </div>
              <button
                type="button"
                className="text-sm text-neutral-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {mode === "form" && (
                <div className="space-y-3">
                  {!user && (
                    <p className="rounded-xl bg-white/5 p-3 text-sm text-neutral-400">
                      <Link to="/auth" className="text-sky-300 underline">
                        Sign in
                      </Link>{" "}
                      to submit. Your request stays linked to your account.
                    </p>
                  )}
                  <Field label="Organization name *">
                    <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Kathmandu FC Esports" />
                  </Field>
                  <Field label="Gmail *">
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Contact name">
                      <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </Field>
                    <Field label="Phone">
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </Field>
                  </div>
                  <Field label="About your community">
                    <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </Field>
                  <Field label="Logo">
                    <ImageUpload value={logo} onChange={setLogo} folder="organizer-apps" aspect="square" />
                  </Field>
                  <Field label="Banner">
                    <ImageUpload value={banner} onChange={setBanner} folder="organizer-apps" aspect="wide" />
                  </Field>
                  <Field label="Theme">
                    <div className="flex flex-wrap gap-2">
                      {THEME_PRESETS.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          title={th.label}
                          onClick={() => setThemeId(th.id)}
                          className={cn(
                            "h-9 w-9 rounded-full border-2",
                            themeId === th.id ? "border-white scale-110" : "border-white/20",
                          )}
                          style={{ background: th.cover }}
                        />
                      ))}
                    </div>
                  </Field>
                  <Button
                    className="w-full bg-neutral-100 text-black"
                    disabled={busy || !user}
                    onClick={() => void submit()}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
                  </Button>
                </div>
              )}

              {mode === "status" && myReq && (
                <div className="flex h-full flex-col gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="font-medium text-neutral-100">{myReq.org_name}</p>
                    <p className="text-xs text-neutral-500">{myReq.contact_email}</p>
                    {(() => {
                      const s = STATUS_UI[myReq.status] ?? STATUS_UI.pending;
                      const Icon = s.icon;
                      return (
                        <span
                          className={cn(
                            "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                            s.className,
                          )}
                        >
                          <Icon className="h-3 w-3" /> {s.label}
                        </span>
                      );
                    })()}
                    {myReq.admin_note && (
                      <p className="mt-2 text-xs text-neutral-400">Admin: {myReq.admin_note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                    <MessageCircle className="h-3.5 w-3.5" /> Direct message with NepARENA
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/10 p-2">
                    {msgs.length === 0 && (
                      <p className="py-6 text-center text-xs text-neutral-500">No messages yet</p>
                    )}
                    {msgs.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          m.is_from_admin
                            ? "bg-white/10 text-neutral-100"
                            : "ml-auto bg-sky-600/90 text-white",
                        )}
                      >
                        {m.body}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Message admins…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void sendMsg();
                      }}
                    />
                    <Button size="icon" disabled={busy} onClick={() => void sendMsg()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {mode === "status" && !myReq && (
                <p className="py-10 text-center text-sm text-neutral-500">
                  No application yet. Switch to Apply.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-neutral-400">{label}</Label>
      {children}
    </div>
  );
}
