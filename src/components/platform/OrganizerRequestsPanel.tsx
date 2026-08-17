import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle,
  Loader2,
  MessageCircle,
  Send,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { inviteOrganizer } from "@/lib/organizers";

type Req = {
  id: string;
  user_id: string | null;
  org_name: string;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  logo_url: string | null;
  banner_url: string | null;
  theme_id: string | null;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type Msg = {
  id: string;
  body: string;
  is_from_admin: boolean;
  created_at: string;
};

export function OrganizerRequestsPanel() {
  const { user } = useAuth();
  const [list, setList] = useState<Req[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("organizer_requests")
      .select(
        "id, user_id, org_name, contact_name, contact_email, contact_phone, logo_url, banner_url, theme_id, description, status, admin_note, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setList((data as Req[]) ?? []);
    setLoading(false);
  };

  const loadMsgs = async (id: string) => {
    const { data } = await supabase
      .from("organizer_request_messages")
      .select("id, body, is_from_admin, created_at")
      .eq("request_id", id)
      .order("created_at", { ascending: true });
    setMsgs((data as Msg[]) ?? []);
    await supabase
      .from("organizer_request_messages")
      .update({ read_by_admin: true })
      .eq("request_id", id)
      .eq("is_from_admin", false)
      .eq("read_by_admin", false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (active) {
      void loadMsgs(active);
      const r = list.find((x) => x.id === active);
      setNote(r?.admin_note ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const setStatus = async (id: string, status: string) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("organizer_requests")
        .update({
          status,
          admin_note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      if (status === "approved" && user) {
        const req = list.find((x) => x.id === id);
        if (req) {
          const baseSlug =
            req.org_name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 48) || "organizer";
          let slug = baseSlug;
          for (let i = 0; i < 5; i++) {
            const { data: exists } = await supabase
              .from("organizers")
              .select("id")
              .eq("slug", slug)
              .maybeSingle();
            if (!exists) break;
            slug = `${baseSlug}-${i + 2}`;
          }
          const payload = {
            name: req.org_name,
            slug,
            logo_url: req.logo_url,
            banner_url: req.banner_url,
            description: req.description,
            status: "active" as const,
            is_verified: true,
            owner_user_id: req.user_id,
          };
          let org: { id: string; slug: string } | null = null;
          let orgErrMsg: string | null = null;

          try {
            const { data: rpcId, error: rpcErr } = await supabase.rpc("approve_organizer_request", {
              p_request_id: id,
              p_slug: slug,
            });
            if (!rpcErr && rpcId) {
              org = { id: String(rpcId), slug };
            } else if (rpcErr) {
              console.warn("approve_organizer_request:", rpcErr.message);
            }
          } catch {
            /* RPC optional */
          }

          if (!org) {
            const { data, error: orgErr } = await supabase
              .from("organizers")
              .upsert(payload, { onConflict: "slug" })
              .select("id, slug")
              .maybeSingle();
            if (orgErr) {
              const ins = await supabase.from("organizers").insert(payload).select("id, slug").maybeSingle();
              if (ins.error) {
                const upd = await supabase
                  .from("organizers")
                  .update({
                    name: payload.name,
                    logo_url: payload.logo_url,
                    banner_url: payload.banner_url,
                    description: payload.description,
                    status: "active",
                    is_verified: true,
                    owner_user_id: payload.owner_user_id,
                  })
                  .eq("slug", slug)
                  .select("id, slug")
                  .maybeSingle();
                if (upd.error) orgErrMsg = upd.error.message;
                else org = upd.data as { id: string; slug: string } | null;
              } else {
                org = ins.data as { id: string; slug: string } | null;
              }
            } else {
              org = data as { id: string; slug: string } | null;
            }
          }

          if (orgErrMsg) {
            toast.error(`Approved request but org create failed: ${orgErrMsg}`);
          } else if (org) {
            if (req.user_id) {
              let memErrMsg: string | null = null;
              {
                const { error: memErr } = await supabase.from("organizer_members").upsert(
                  { organizer_id: org.id, user_id: req.user_id, role: "owner" },
                  { onConflict: "organizer_id,user_id" },
                );
                if (memErr) {
                  const ins = await supabase.from("organizer_members").insert({
                    organizer_id: org.id,
                    user_id: req.user_id,
                    role: "owner",
                  });
                  if (ins.error) memErrMsg = ins.error.message;
                }
              }
              if (memErrMsg) toast.message(`Org live but membership: ${memErrMsg}`);
              try {
                const { notify } = await import("@/lib/notifications");
                await notify({
                  userId: req.user_id,
                  title: "Your organizer page is live",
                  body: `${req.org_name} is live. Open Dashboard to host tournaments, or view /o/${org.slug}.`,
                  type: "success",
                  link: "/dashboard",
                });
                toast.success(`${req.org_name} is live — requester notified`);
              } catch {
                toast.success(`Approved — live at /o/${org.slug}`);
              }
            } else {
              toast.success(`Approved — live at /o/${org.slug}`);
            }
          } else {
            toast.success("Request approved");
          }
          const inv = await inviteOrganizer({
            email: req.contact_email,
            name: req.org_name,
            slug,
            invitedBy: user.id,
          });
          if (!inv.ok) console.warn("invite", inv.error);
        }
      } else {
        toast.success(`Marked ${status}`);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!user || !active || !text.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("organizer_request_messages").insert({
        request_id: active,
        sender_id: user.id,
        is_from_admin: true,
        body: text.trim(),
        read_by_admin: true,
        read_by_applicant: false,
      });
      if (error) throw error;
      setText("");
      await loadMsgs(active);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const current = list.find((x) => x.id === active);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Organizer requests</h2>
          <p className="text-sm text-neutral-500">Review applications · message applicants</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["pending", "changes_requested", "approved", "rejected", "all"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs capitalize",
                filter === f ? "bg-neutral-100 text-black" : "bg-white/5 text-neutral-400",
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
          <Button size="sm" variant="outline" className="border-white/15" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-white/10 lg:col-span-2">
          {loading && (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          )}
          {!loading && list.length === 0 && (
            <p className="p-6 text-sm text-neutral-500">No requests</p>
          )}
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActive(r.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-white/[0.04]",
                active === r.id && "bg-white/[0.06]",
              )}
            >
              {r.logo_url ? (
                <img src={r.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-neutral-800 text-xs font-bold">
                  {r.org_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.org_name}</p>
                <p className="truncate text-xs text-neutral-500">{r.contact_email}</p>
                <Badge variant="secondary" className="mt-1 text-[10px] uppercase">
                  {r.status}
                </Badge>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-3">
          {!current ? (
            <p className="py-16 text-center text-sm text-neutral-500">Select a request</p>
          ) : (
            <div className="space-y-4">
              {current.banner_url && (
                <img src={current.banner_url} alt="" className="h-28 w-full rounded-xl object-cover" />
              )}
              <div>
                <h3 className="text-lg font-semibold">{current.org_name}</h3>
                <p className="text-sm text-neutral-400">
                  {current.contact_name || "—"} · {current.contact_email}
                  {current.contact_phone ? ` · ${current.contact_phone}` : ""}
                </p>
                {current.description && (
                  <p className="mt-2 text-sm text-neutral-300">{current.description}</p>
                )}
              </div>

              <Input
                placeholder="Admin note (visible to applicant)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  disabled={busy}
                  onClick={() => void setStatus(current.id, "approved")}
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15"
                  disabled={busy}
                  onClick={() => void setStatus(current.id, "changes_requested")}
                >
                  <AlertCircle className="mr-1 h-3.5 w-3.5" /> Request changes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-300"
                  disabled={busy}
                  onClick={() => void setStatus(current.id, "rejected")}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                </Button>
              </div>

              <div className="border-t border-white/10 pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                  <MessageCircle className="h-3.5 w-3.5" /> Direct message
                </p>
                <div className="mb-2 max-h-40 space-y-1.5 overflow-y-auto">
                  {msgs.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm",
                        m.is_from_admin
                          ? "ml-auto bg-sky-600/90 text-white"
                          : "bg-white/10 text-neutral-100",
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
                    placeholder="Reply to applicant…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void send();
                    }}
                  />
                  <Button size="icon" disabled={busy} onClick={() => void send()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
