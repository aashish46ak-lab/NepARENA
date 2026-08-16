/**
 * Owner / Admin / Moderator team — synced with public organizer page via organizer_members.
 */
import { useCallback, useEffect, useState } from "react";
import { AdminSection, EmptyState } from "./AdminUI";
import {
  addOrganizerMember,
  getDefaultOrganizer,
  listOrganizerMemberships,
  listOrganizerTeam,
  removeOrganizerMember,
  searchProfilesForTeam,
  updateOrganizerMemberRole,
  type Organizer,
  type MemberRole,
  type OrganizerTeamMember,
} from "@/lib/organizers";
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

const ROLES: { value: MemberRole; label: string; hint: string }[] = [
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

  useEffect(() => {
    void (async () => {
      setOrgLoading(true);
      try {
        if (user?.id) {
          const memberships = await listOrganizerMemberships(user.id);
          const first = memberships[0];
          if (first?.organizer) {
            setOrganizer(first.organizer);
            setOrganizerId(first.organizer_id);
            setOrgLoading(false);
            return;
          }
        }
        const def = await getDefaultOrganizer();
        setOrganizer(def);
        setOrganizerId(def?.id ?? null);
      } finally {
        setOrgLoading(false);
      }
    })();
  }, [user?.id]);

  const reload = useCallback(async () => {
    if (!organizerId) {
      setTeam([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTeam(await listOrganizerTeam(organizerId));
    } finally {
      setLoading(false);
    }
  }, [organizerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [role, setRole] = useState<MemberRole>("moderator");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchProfilesForTeam(search).then((r) => {
        setResults(r as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]);
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [search, open]);

  const addMember = async (userId: string) => {
    if (!organizerId || busy) return;
    setBusy(true);
    const res = await addOrganizerMember({ organizerId, userId, role });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not add member");
      return;
    }
    toast.success("Member added");
    setOpen(false);
    setSearch("");
    void reload();
    void qc.invalidateQueries({ queryKey: ["organizer_team"] });
  };

  const changeRole = async (userId: string, next: MemberRole) => {
    if (!organizerId) return;
    const res = await updateOrganizerMemberRole({
      organizerId,
      userId,
      role: next,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Could not update role");
      return;
    }
    toast.success("Role updated");
    void reload();
    void qc.invalidateQueries({ queryKey: ["organizer_team"] });
  };

  const remove = async (userId: string) => {
    if (!organizerId) return;
    if (!window.confirm("Remove this team member?")) return;
    const res = await removeOrganizerMember({ organizerId, userId });
    if (!res.ok) {
      toast.error(res.error ?? "Could not remove");
      return;
    }
    toast.success("Removed");
    void reload();
    void qc.invalidateQueries({ queryKey: ["organizer_team"] });
  };

  if (orgLoading) {
    return (
      <AdminSection title="Owner & team" description="Loading organizer…">
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      </AdminSection>
    );
  }

  if (!organizerId) {
    return (
      <AdminSection title="Owner & team" description="Manage owners, admins, and moderators.">
        <EmptyState title="No organizer linked" description="Create or join an organizer to manage the team." />
      </AdminSection>
    );
  }

  return (
    <AdminSection
      title="Owner & team"
      description={
        organizer
          ? `Roles for ${organizer.name}. Shown on the public organizer page.`
          : "Owners, admins, and moderators for this organizer."
      }
      action={
        <Button size="sm" className="rounded-full bg-sky-500 text-white" onClick={() => setOpen(true)}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add member
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      ) : team.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Add an owner, admin, or moderator. They appear on the public About / team section."
        />
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {team.map((m) => {
            const name = m.full_name?.trim() || m.username?.trim() || "Player";
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{name}</p>
                  {m.username && (
                    <p className="truncate text-xs text-neutral-500">@{m.username}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-neutral-200"
                    value={m.role}
                    onChange={(e) =>
                      void changeRole(
                        m.user_id,
                        e.target.value as MemberRole,
                      )
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-neutral-400 hover:text-rose-300"
                    onClick={() => void remove(m.user_id)}
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <span
            key={r.value}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-neutral-400"
          >
            <Shield className="h-3 w-3 text-sky-400" />
            <span className="font-semibold text-neutral-200">{r.label}</span>
            <span className="text-neutral-500">— {r.hint}</span>
          </span>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#121214] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-sky-400" /> Add team member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search by name or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-white/10 bg-black/30"
            />
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition",
                    role === r.value
                      ? "bg-sky-500 text-white"
                      : "bg-white/5 text-neutral-400 hover:bg-white/10",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {results.length === 0 && search.trim().length >= 2 && (
                <p className="py-4 text-center text-xs text-neutral-500">No users found</p>
              )}
              {results.map((p) => {
                const name = p.full_name?.trim() || p.username?.trim() || "Player";
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void addMember(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{name}</p>
                      {p.username && (
                        <p className="truncate text-[11px] text-neutral-500">@{p.username}</p>
                      )}
                    </div>
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminSection>
  );
}
