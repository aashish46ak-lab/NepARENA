import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildDailyQuiz, utcDateKey } from "@/lib/quiz-questions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Brain, RotateCcw, Trophy } from "lucide-react";
import { analytics } from "@/lib/analytics";

const SECONDS = 20;

export function DailyQuizGame({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const dateKey = utcDateKey();
  const questions = useMemo(
    () =>
      buildDailyQuiz({
        dateKey,
        userSalt: user?.id ?? (typeof window !== "undefined" ? localStorage.getItem("nq_anon") ?? undefined : undefined),
      }),
    [dateKey, user?.id],
  );

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    analytics.gamePlay("daily_quiz");
    try {
      if (!user && typeof window !== "undefined" && !localStorage.getItem("nq_anon")) {
        localStorage.setItem("nq_anon", crypto.randomUUID());
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (done || picked !== null) return;
    if (timeLeft <= 0) {
      setPicked(-1);
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, done, picked]);

  useEffect(() => {
    if (picked === null) return;
    const t = window.setTimeout(() => {
      if (idx + 1 >= questions.length) {
        setDone(true);
        void saveScore(score + (picked === questions[idx]?.correctIndex ? 1 : 0));
      } else {
        setIdx((i) => i + 1);
        setPicked(null);
        setTimeLeft(SECONDS);
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const saveScore = async (finalScore: number) => {
    setBest((b) => (b == null ? finalScore : Math.max(b, finalScore)));
    if (!user) return;
    try {
      await supabase.from("daily_quiz_scores").upsert(
        {
          user_id: user.id,
          quiz_date: dateKey,
          score: finalScore,
          total: questions.length,
        },
        { onConflict: "user_id,quiz_date" },
      );
    } catch {
      /* table may not exist yet */
    }
  };

  const choose = (i: number) => {
    if (picked !== null || done) return;
    const q = questions[idx];
    if (!q) return;
    setPicked(i);
    if (i === q.correctIndex) setScore((s) => s + 1);
  };

  const restart = () => {
    setIdx(0);
    setScore(0);
    setPicked(null);
    setDone(false);
    setTimeLeft(SECONDS);
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-950 to-[#12081f] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-300">Daily</p>
        <h3 className="mt-1 text-lg font-bold text-white">Football Quiz</h3>
        <p className="mt-1 text-xs text-slate-400">10 timed questions · new mix every day</p>
        <Button asChild className="mt-4 bg-violet-500 font-semibold text-white hover:bg-violet-400">
          <a href="/games/daily-quiz">
            <Brain className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  const q = questions[idx];

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-violet-500/25 bg-[#0a0612] p-6 text-center">
        <Trophy className="mx-auto h-8 w-8 text-amber-300" />
        <p className="mt-3 text-xl font-black text-white">
          {score}/{questions.length}
        </p>
        <p className="mt-1 text-sm text-slate-400">Today's quiz complete</p>
        {best != null && (
          <p className="mt-1 text-xs text-violet-300">Session best: {best}</p>
        )}
        <Button className="mt-5 border-white/15" variant="outline" onClick={restart}>
          <RotateCcw className="mr-2 h-4 w-4" /> Review again
        </Button>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-b from-slate-950 via-[#100818] to-black">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">Daily Football Quiz</p>
          <p className="text-[10px] text-slate-500">{q.topic} · {dateKey}</p>
        </div>
        <div className="text-right text-[11px] tabular-nums text-slate-400">
          <p>
            {idx + 1}/{questions.length}
          </p>
          <p className={cn(timeLeft <= 5 && "text-rose-400")}>
            {timeLeft}s · {score} pts
          </p>
        </div>
      </div>

      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-violet-400 transition-all duration-1000 linear"
          style={{ width: `${(timeLeft / SECONDS) * 100}%` }}
        />
      </div>

      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold leading-relaxed text-white">{q.q}</p>
        <div className="grid gap-2">
          {q.choices.map((c, i) => {
            const isCorrect = i === q.correctIndex;
            const show = picked !== null;
            return (
              <button
                key={`${q.id}-${i}`}
                type="button"
                disabled={picked !== null}
                onClick={() => choose(i)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                  !show && "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
                  show && isCorrect && "border-emerald-400/50 bg-emerald-500/20 text-emerald-100",
                  show && picked === i && !isCorrect && "border-rose-400/50 bg-rose-500/20 text-rose-100",
                  show && picked !== i && !isCorrect && "border-white/5 opacity-50",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
