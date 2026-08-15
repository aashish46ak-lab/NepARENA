/**
 * Owner / Admin / Moderator team — synced with public organizer page via organizer_members.
 */
import { useCallback, useEffect, useState } from "react";
import { AdminSection, EmptyState } from "./AdminUI";
import {
  getDefaultOrganizer,
  listOrganizerMemberships,
  type Organizer,
  type OrganizerMemberRole,
} from "@/lib/organizers";
import {
  addOrganizerMember,
  listOrganizerTeam,
  removeOrganizerMember,
  searchProfilesForTeam,
  updateOrganizerMemberRole,
  type OrganizerTeamMember,
} from "@/lib/organizer-team";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeCheck, Loader2, Plus, Shield, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const ROLES: { value: OrganizerMemberRole; label: string; hint: string }[] = [
  { value: "owner", label: "Owner", hint: "Highest organizer authority" },
  { value: "admin", label: "Admin", hint: "Organizer management" },
  { value: "moderator", label: "Moderator", hint: "Community moderation" },
];

export function OwnerModeratorsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [team, setTeam] = useState<OrganizerTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<OrganizerMemberRole>("moderator");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    { id: string; full_name: string | null; username: string | null; avatar_url: string | null; is_verified?: boolean }[]
  >([]);
  const [selected, setSelected] = useState<
    { id: string; full_name: string | null; username: string | null; avatar_url: string | null } | null
  >(null);
  const [displayName, setDisplayName] = useState("");
  const [contact, setContact] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    void (async () => {
      setOrgLoading(true);
      let org = await getDefaultOrganizer();
      if (user) {
        const memberships = await listOrganizerMemberships(user.id);
        if (memberships[0]?.organizer_id) {
          const { data } = await supabase
            .from("organizers")
            .select("*")
            .eq("id", memberships[0].organizer_id)
            .maybeSingle();
          if (data) org = data as Organizer;
        }
      }
      setOrganizer(org);
      setOrganizerId(org?.id ?? null);
      setOrgLoading(false);
    })();
  }, [user?.id]);

  const reload = useCallback(async () => {
    if (!organizerId) {
      setTeam([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await listOrganizerTeam(organizerId);
    setTeam(rows);
    setLoading(false);
    void qc.invalidateQueries({ queryKey: ["organizer_team", organizerId] });
  }, [organizerId, qc]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSearching(true);
      void searchProfilesForTeam(search).then((r) => {
        setResults(r);
        setSearching(false);
      });
    }, 280);
    return () => window.clearTimeout(t);
  }, [search]);

  const openAdd = () => {
    setRole("moderator");
    setSearch("");
    setResults([]);
    setSelected(null);
    setDisplayName("");
    setContact("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!organizerId || !selected) {
      toast.error("Select a profile");
      return;
    }
    setBusy(true);
    const res = await addOrganizerMember({ organizerId, userId: selected.id, role });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Team member saved");
    setModalOpen(false);
    void reload();
  };

  const changeRole = async (userId: string, next: OrganizerMemberRole) => {
    if (!organizerId) return;
    const res = await updateOrganizerMemberRole({ organizerId, userId, role: next });
    if (!res.ok) toast.error(res.error);
    else {
      toast.success("Role updated");
      void reload();
    }
  };

  const remove = async (userId: string, name: string) => {
    if (!organizerId) return;
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    const res = await removeOrganizerMember({ organizerId, userId });
    if (!res.ok) toast.error(res.error);
    else {
      toast.success("Removed");
      void reload();
    }
  };

  if (orgLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organizerId) {
    return (
      <AdminSection title="Owner & Moderators">
        <EmptyState message="No organizer context. Join or create an organizer first." />
      </AdminSection>
    );
  }

  return (
    <>
      <AdminSection
        title="Owner, Admins & Moderators"
        action={
          <Button size="sm" className="rounded-full" onClick={openAdd}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        }
      >
        <p className="mb-4 text-xs text-muted-foreground">
          Same team is shown on the public page for{" "}
          <span className="font-medium text-foreground">{organizer?.name}</span>. Roles: Owner · Admin · Moderator.
        </p>

        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : team.length === 0 ? (
          <EmptyState message="No team members yet. Add an owner or moderator." />
        ) : (
          <ul className="space-y-2">
            {team.map((m) => {
              const name = m.full_name?.trim() || m.username?.trim() || "Player";
              return (
                <li
                  key={`${m.organizer_id}-${m.user_id}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={m.avatar_url ?? undefined} />
                    <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      {m.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.username ? `@${m.username}` : m.user_id.slice(0, 8)}
                    </p>
                  </div>
                  <select
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                    value={m.role}
                    onChange={(e) => void changeRole(m.user_id, e.target.value as OrganizerMemberRole)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400" onClick={() => void remove(m.user_id, name)} aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#121214] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-sky-400" /> Add team member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-400">Role</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-center transition",
                      role === r.value
                        ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                        : "border-white/10 bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06]",
                    )}
                  >
                    <Shield className="mx-auto mb-1 h-3.5 w-3.5" />
                    <span className="block text-xs font-semibold">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">{ROLES.find((r) => r.value === role)?.hint}</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-400">Profile</p>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search username or name…" className="border-white/10 bg-black/40" autoFocus />
              {searching && <p className="mt-1 text-[11px] text-neutral-500">Searching…</p>}
              {results.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white/10">
                  {results.map((p) => {
                    const n = p.full_name?.trim() || p.username?.trim() || "Player";
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={cn("flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-white/5", selected?.id === p.id && "bg-sky-500/15")}
                          onClick={() => {
                            setSelected(p);
                            setDisplayName(n);
                            setSearch(p.username || n);
                            setResults([]);
                          }}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback>{n.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate text-sm text-white">
                            {n}{p.username ? <span className="text-neutral-500"> @{p.username}</span> : null}
                          </span>
                          {p.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {selected && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-2 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selected.avatar_url ?? undefined} />
                    <AvatarFallback>{(displayName || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white">{displayName}</span>
                </div>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-400">Display name</p>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name shown on team card" className="border-white/10 bg-black/40" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-400">Contact (email)</p>
              <Input type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="optional@email.com" className="border-white/10 bg-black/40" />
              <p className="mt-1 text-[11px] text-neutral-500">Role is stored in organizer_members and appears on the public organizer page.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-sky-500 text-white hover:bg-sky-400" disabled={busy || !selected} onClick={() => void save()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
