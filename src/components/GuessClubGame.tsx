import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameResultActions } from "@/components/GameResultActions";
import { RotateCcw, Building2 } from "lucide-react";

const CLUBS: { name: string; country: string; hint: string }[] = [
  { name: "Real Madrid", country: "Spain", hint: "Los Blancos · 14 UCL" },
  { name: "Barcelona", country: "Spain", hint: "Blaugrana · Camp Nou" },
  { name: "Manchester United", country: "England", hint: "Red Devils · Old Trafford" },
  { name: "Liverpool", country: "England", hint: "You'll Never Walk Alone" },
  { name: "Bayern Munich", country: "Germany", hint: "Die Roten · Allianz Arena" },
  { name: "Juventus", country: "Italy", hint: "Bianconeri · Turin" },
  { name: "AC Milan", country: "Italy", hint: "Rossoneri · San Siro" },
  { name: "Inter Milan", country: "Italy", hint: "Nerazzurri" },
  { name: "Paris Saint-Germain", country: "France", hint: "PSG · Parc des Princes" },
  { name: "Manchester City", country: "England", hint: "Citizens · Etihad" },
  { name: "Chelsea", country: "England", hint: "The Blues · Stamford Bridge" },
  { name: "Arsenal", country: "England", hint: "Gunners · North London" },
  { name: "Borussia Dortmund", country: "Germany", hint: "BVB · Yellow Wall" },
  { name: "Ajax", country: "Netherlands", hint: "Amsterdam · Total Football" },
  { name: "Porto", country: "Portugal", hint: "Dragons · Dragão" },
  { name: "Benfica", country: "Portugal", hint: "Eagles · Lisbon" },
  { name: "Celtic", country: "Scotland", hint: "Bhoys · Glasgow" },
  { name: "River Plate", country: "Argentina", hint: "Millonarios · Buenos Aires" },
  { name: "Boca Juniors", country: "Argentina", hint: "Xeneizes · La Bombonera" },
  { name: "Flamengo", country: "Brazil", hint: "Mengão · Rio" },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function GuessClubGame({ compact = false }: { compact?: boolean }) {
  const [seed, setSeed] = useState(0);
  const deck = useMemo(() => shuffle(CLUBS).slice(0, 10), [seed]);
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const club = deck[idx];

  const submit = () => {
    if (!club || done) return;
    const ok =
      normalize(guess) === normalize(club.name) ||
      normalize(guess).includes(normalize(club.name).split(" ")[0]!);
    if (ok) {
      setScore((s) => s + 1);
      setFeedback(`Correct — ${club.name}!`);
    } else {
      setFeedback(`It was ${club.name}`);
    }
    window.setTimeout(() => {
      setFeedback(null);
      setGuess("");
      if (idx + 1 >= deck.length) setDone(true);
      else setIdx((i) => i + 1);
    }, 900);
  };

  const restart = () => {
    setSeed((s) => s + 1);
    setIdx(0);
    setGuess("");
    setScore(0);
    setFeedback(null);
    setDone(false);
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-950 to-[#061820] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">Clubs</p>
        <h3 className="mt-1 text-lg font-bold text-white">Guess the Club</h3>
        <p className="mt-1 text-xs text-slate-400">Hints only · name the club</p>
        <Button asChild className="mt-4 bg-cyan-500 font-semibold text-black hover:bg-cyan-400">
          <a href="/games/guess-club">
            <Building2 className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-cyan-500/25 bg-[#060e12] p-6 text-center">
        <p className="text-xl font-black text-white">
          {score}/{deck.length}
        </p>
        <p className="text-sm text-slate-400">Guess the Club complete</p>
        <GameResultActions
          game="Guess the Club"
          headline={`Scored ${score}/${deck.length}`}
          lines={["NepARENA Arcade"]}
        />
        <Button variant="outline" className="border-white/15" onClick={restart}>
          <RotateCcw className="mr-2 h-4 w-4" /> Play again
        </Button>
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-slate-950 to-[#061018]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Guess the Club</p>
          <p className="text-[10px] text-slate-500">
            {idx + 1}/{deck.length} · Score {score}
          </p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
          <p className="text-[11px] uppercase tracking-wider text-cyan-300/80">Hint</p>
          <p className="mt-2 text-lg font-semibold text-white">{club.hint}</p>
          <p className="mt-2 text-xs text-slate-500">Country: {club.country}</p>
        </div>
        <Input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Type club name…"
          className="border-white/15 bg-black/40"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {feedback && <p className="text-center text-sm text-amber-200">{feedback}</p>}
        <Button className="w-full bg-cyan-500 font-semibold text-black hover:bg-cyan-400" onClick={submit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
