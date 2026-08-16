/**
 * Game-aware tournament registration form.
 * Fields come from the game registry (not hardcoded eFootball fields).
 */
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getGame, type GameId, type RegistrationField } from "@/lib/games";
import { supabase, type Tournament } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function GameRegisterForm({
  tournament,
  onDone,
}: {
  tournament: Tournament;
  onDone?: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const game = getGame(tournament.game as GameId);
  const mode =
    (tournament.game_config as { participant_mode?: string } | null)
      ?.participant_mode ?? game.defaultMode;

  const fields = useMemo(() => {
    return game.registrationFields.filter(
      (f) => !f.modes || f.modes.includes(mode as never),
    );
  }, [game, mode]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    if (!user) {
      toast.message("Sign in to register");
      return;
    }
    for (const f of fields) {
      if (f.required && !(values[f.key] || "").trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setBusy(true);
    try {
      const playerName =
        values.player_name ||
        values.team_name ||
        values.captain_name ||
        values.ign ||
        user.email?.split("@")[0] ||
        "Player";

      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournament.id,
        user_id: user.id,
        player_name: playerName,
        team_name: values.team_name || values.player_name || null,
        club: values.club || null,
        status: "pending",
        game_payload: {
          ...values,
          game: game.id,
          participant_mode: mode,
        },
      });
      if (error) {
        if (error.message.includes("duplicate") || error.code === "23505") {
          toast.error("You are already registered for this tournament");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Registration submitted — wait for approval");
      void qc.invalidateQueries({ queryKey: ["tournament", tournament.id] });
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">
        Sign in to register for this {game.shortName} tournament.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">
          Register · {game.shortName}
        </h3>
        <p className="text-xs text-neutral-500">
          Mode: {mode} · {game.terminology.participant} entry
        </p>
      </div>
      {fields.map((f: RegistrationField) => (
        <div key={f.key} className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-400">
            {f.label}
            {f.required ? " *" : ""}
          </label>
          {f.type === "textarea" || f.type === "roster" ? (
            <Textarea
              rows={f.type === "roster" ? 3 : 2}
              placeholder={f.placeholder || f.label}
              value={values[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : f.type === "select" && f.options ? (
            <select
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              value={values[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            >
              <option value="">Select…</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={f.type === "number" ? "number" : "text"}
              placeholder={f.placeholder || f.label}
              value={values[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
          {f.help && (
            <p className="text-[10px] text-neutral-600">{f.help}</p>
          )}
        </div>
      ))}
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit registration"}
      </Button>
    </div>
  );
}
