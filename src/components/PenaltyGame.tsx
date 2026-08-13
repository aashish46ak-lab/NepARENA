import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotateCcw, Target } from "lucide-react";
import { analytics } from "@/lib/analytics";

/** Normalized aim: x -1..1 (left-right), y 0..1 (ground→top), power 0.25..1 */
type ShotAim = { x: number; y: number; power: number };
type DiveAim = { x: number; y: number }; // -1..1, 0..1
type KickResult = "goal" | "save" | "miss" | null;
type Phase =
  | "intro"
  | "user_shoot"
  | "anim_user_shot"
  | "ai_keep_react"
  | "user_keep"
  | "anim_ai_shot"
  | "between"
  | "sudden_death_banner"
  | "done";

const ROUNDS = 5;
const W = 360;
const H = 420;

// Goal mouth in stage coords (origin top-left of pitch canvas)
const GOAL = { left: 58, right: 302, top: 52, bottom: 168, cx: 180 };
const SPOT = { x: 180, y: 340 };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Lightweight procedural SFX (no assets) */
function playTone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.08,
  slideTo?: number,
) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
    void ctx.resume().catch(() => {});
    window.setTimeout(() => void ctx.close().catch(() => {}), (dur + 0.1) * 1000);
  } catch {
    /* ignore */
  }
}

const sfx = {
  whistle: () => playTone(1200, 0.15, "square", 0.04),
  kick: () => playTone(90, 0.12, "triangle", 0.12, 40),
  dive: () => playTone(180, 0.18, "sine", 0.05, 90),
  net: () => {
    playTone(220, 0.25, "sawtooth", 0.04, 80);
    playTone(140, 0.3, "triangle", 0.05);
  },
  save: () => playTone(300, 0.2, "square", 0.06, 120),
  post: () => playTone(800, 0.08, "square", 0.07, 400),
  cheer: () => {
    playTone(400, 0.4, "sine", 0.03);
    playTone(520, 0.45, "triangle", 0.025);
  },
  miss: () => playTone(160, 0.35, "sawtooth", 0.04, 60),
};

function aiShot(): ShotAim {
  // Varied placement — prefer corners, occasional weak center
  const roll = Math.random();
  let x: number;
  let y: number;
  let power: number;
  if (roll < 0.35) {
    x = Math.random() < 0.5 ? -0.85 - Math.random() * 0.12 : 0.85 + Math.random() * 0.12;
    y = 0.72 + Math.random() * 0.25;
    power = 0.7 + Math.random() * 0.28;
  } else if (roll < 0.55) {
    x = Math.random() < 0.5 ? -0.75 : 0.75;
    y = 0.15 + Math.random() * 0.25;
    power = 0.55 + Math.random() * 0.35;
  } else if (roll < 0.75) {
    x = (Math.random() - 0.5) * 0.5;
    y = 0.55 + Math.random() * 0.35;
    power = 0.65 + Math.random() * 0.3;
  } else {
    x = (Math.random() - 0.5) * 1.6;
    y = Math.random();
    power = 0.4 + Math.random() * 0.55;
  }
  return { x: clamp(x, -1.15, 1.15), y: clamp(y, 0.05, 1), power: clamp(power, 0.3, 1) };
}

function aiDive(against: ShotAim): DiveAim {
  // Partially anticipates — sometimes wrong
  const smart = Math.random() < 0.42;
  if (smart) {
    return {
      x: clamp(against.x + (Math.random() - 0.5) * 0.35, -1, 1),
      y: clamp(against.y + (Math.random() - 0.5) * 0.3, 0, 1),
    };
  }
  return { x: (Math.random() - 0.5) * 2, y: Math.random() };
}

function shotTarget(aim: ShotAim) {
  const gx = lerp(GOAL.left + 12, GOAL.right - 12, (aim.x + 1) / 2);
  const gy = lerp(GOAL.bottom - 10, GOAL.top + 8, aim.y);
  return { x: gx, y: gy };
}

/** Resolve goal / save / miss */
function resolveShot(shot: ShotAim, dive: DiveAim, isKeeperHuman: boolean): KickResult {
  const target = shotTarget(shot);
  // Wide / over
  if (target.x < GOAL.left - 8 || target.x > GOAL.right + 8 || target.y < GOAL.top - 18) {
    return "miss";
  }
  if (target.y > GOAL.bottom + 6) return "miss";

  const diveX = lerp(GOAL.left + 20, GOAL.right - 20, (dive.x + 1) / 2);
  const diveY = lerp(GOAL.bottom - 15, GOAL.top + 15, dive.y);
  const reachX = 48 + (isKeeperHuman ? 6 : 4);
  const reachY = 40 + (isKeeperHuman ? 4 : 2);
  const dx = Math.abs(target.x - diveX);
  const dy = Math.abs(target.y - diveY);
  // Strong shots harder to save; low power easier
  const powerPenalty = shot.power * 14;
  const saved = dx < reachX - powerPenalty * 0.35 && dy < reachY - powerPenalty * 0.2;
  return saved ? "save" : "goal";
}

type BallState = { x: number; y: number; scale: number; visible: boolean };
type KeeperState = {
  x: number;
  y: number;
  rot: number;
  stretch: number;
  pose: "idle" | "dive" | "land" | "celebrate" | "hold";
};

const idleBall = (): BallState => ({
  x: SPOT.x,
  y: SPOT.y,
  scale: 1,
  visible: true,
});
const idleKeeper = (): KeeperState => ({
  x: GOAL.cx,
  y: GOAL.bottom - 8,
  rot: 0,
  stretch: 0,
  pose: "idle",
});

export function PenaltyGame({ compact = false }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(1); // 1..5 then sudden death
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [userGoals, setUserGoals] = useState(0);
  const [aiGoals, setAiGoals] = useState(0);
  const [userMarks, setUserMarks] = useState<KickResult[]>([]);
  const [aiMarks, setAiMarks] = useState<KickResult[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [netPulse, setNetPulse] = useState(0);
  const [cam, setCam] = useState({ z: 1, y: 0 });

  const [ball, setBall] = useState<BallState>(idleBall);
  const [keeper, setKeeper] = useState<KeeperState>(idleKeeper);

  // Drag state
  const dragRef = useRef<{
    mode: "shoot" | "dive" | null;
    x0: number;
    y0: number;
    x: number;
    y: number;
    active: boolean;
  }>({ mode: null, x0: 0, y0: 0, x: 0, y: 0, active: false });
  const [guide, setGuide] = useState<{ x: number; y: number; power: number } | null>(null);

  const animRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    analytics.gamePlay("penalty");
  }, []);

  const cancelAnim = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  useEffect(() => () => cancelAnim(), []);

  const resetMatch = () => {
    cancelAnim();
    setPhase("intro");
    setRound(1);
    setSuddenDeath(false);
    setUserGoals(0);
    setAiGoals(0);
    setUserMarks([]);
    setAiMarks([]);
    setBanner(null);
    setBall(idleBall());
    setKeeper(idleKeeper());
    setGuide(null);
    setCam({ z: 1, y: 0 });
    setShake(0);
    setNetPulse(0);
  };

  const startMatch = () => {
    sfx.whistle();
    setPhase("user_shoot");
    setBall(idleBall());
    setKeeper(idleKeeper());
    setBanner("Your penalty");
    window.setTimeout(() => setBanner(null), 1200);
  };

  /** Animate ball along curve + keeper dive */
  const runShotAnimation = useCallback(
    (opts: {
      shot: ShotAim;
      dive: DiveAim;
      result: KickResult;
      onDone: () => void;
    }) => {
      cancelAnim();
      const { shot, dive, result, onDone } = opts;
      const target = shotTarget(shot);
      // Miss trajectories fly past goal
      let endX = target.x;
      let endY = target.y;
      if (result === "miss") {
        if (shot.y > 0.85) {
          endY = GOAL.top - 40 - Math.random() * 30;
          endX = target.x + (Math.random() - 0.5) * 40;
        } else if (shot.x < -0.9) {
          endX = GOAL.left - 50;
        } else if (shot.x > 0.9) {
          endX = GOAL.right + 50;
        } else {
          endX = target.x + (shot.x > 0 ? 40 : -40);
          endY = target.y - 20;
        }
      }
      if (result === "save") {
        // Deflect off keeper
        endX = target.x + (dive.x > 0 ? 35 : -35);
        endY = target.y + 25;
      }

      const diveX = lerp(GOAL.left + 24, GOAL.right - 24, (dive.x + 1) / 2);
      const diveY = lerp(GOAL.bottom - 12, GOAL.top + 20, dive.y);
      const diveRot = dive.x * 38;

      const duration = 720 + (1 - shot.power) * 280;
      const t0 = performance.now();
      sfx.kick();
      window.setTimeout(() => sfx.dive(), 90);

      setCam({ z: 1.06, y: -6 });

      const tick = (now: number) => {
        const t = clamp((now - t0) / duration, 0, 1);
        const e = easeOutCubic(t);

        // Ball: arc with peak mid-flight
        const peak = -55 - shot.y * 40 - shot.power * 20;
        const arc = Math.sin(Math.PI * e) * peak;
        const bx = lerp(SPOT.x, endX, e);
        const by = lerp(SPOT.y, endY, e) + arc;
        const sc = lerp(1, 0.45 + shot.power * 0.1, e);

        // Keeper reacts after short delay
        const kt = clamp((t - 0.08) / 0.55, 0, 1);
        const ke = easeInOut(kt);
        const kx = lerp(GOAL.cx, diveX, ke);
        const ky = lerp(GOAL.bottom - 8, diveY, ke);
        const kr = lerp(0, diveRot, ke);
        const stretch = ke * (0.6 + Math.abs(dive.x) * 0.4);

        setBall({ x: bx, y: by, scale: sc, visible: true });
        setKeeper({
          x: kx,
          y: ky,
          rot: kr,
          stretch,
          pose: kt > 0.85 ? (result === "save" ? "hold" : "land") : kt > 0.05 ? "dive" : "idle",
        });

        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          if (result === "goal") {
            sfx.net();
            sfx.cheer();
            setNetPulse(1);
            setShake(1);
            setBanner("GOAL!");
            window.setTimeout(() => setNetPulse(0), 600);
            window.setTimeout(() => setShake(0), 400);
          } else if (result === "save") {
            sfx.save();
            setBanner("SAVED!");
            setKeeper((k) => ({ ...k, pose: "hold" }));
          } else {
            sfx.miss();
            if (Math.random() < 0.4) sfx.post();
            setBanner("MISS!");
            setKeeper((k) => ({ ...k, pose: "celebrate" }));
          }
          setCam({ z: 1, y: 0 });
          window.setTimeout(() => {
            setBanner(null);
            onDone();
          }, 1100);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  const afterUserShot = (result: KickResult) => {
    setUserMarks((m) => [...m, result]);
    if (result === "goal") setUserGoals((g) => g + 1);

    // AI turn to shoot — user keeps
    window.setTimeout(() => {
      setBall(idleBall());
      setKeeper(idleKeeper());
      setPhase("user_keep");
      setBanner("Save this!");
      window.setTimeout(() => setBanner(null), 1000);
    }, 200);
  };

  const afterAiShot = (result: KickResult, nextRound: number, sd: boolean) => {
    setAiMarks((m) => [...m, result]);
    let aiG = aiGoals;
    let userG = userGoals;
    if (result === "goal") {
      aiG = aiGoals + 1;
      setAiGoals(aiG);
    }
    // Re-read marks length via nextRound
    const kicksDone = nextRound; // after this pair

    window.setTimeout(() => {
      setBall(idleBall());
      setKeeper(idleKeeper());

      if (!sd && kicksDone >= ROUNDS) {
        // End of regulation
        if (userG === aiG) {
          setSuddenDeath(true);
          setRound(ROUNDS + 1);
          setPhase("sudden_death_banner");
          setBanner("Sudden death");
          window.setTimeout(() => {
            setBanner(null);
            setPhase("user_shoot");
            setBanner("Your penalty");
            window.setTimeout(() => setBanner(null), 1000);
          }, 1400);
          return;
        }
        setPhase("done");
        sfx.whistle();
        return;
      }

      if (sd) {
        // Sudden death: after each pair, if scores differ → end
        if (userG !== aiG) {
          setPhase("done");
          sfx.whistle();
          return;
        }
        setRound((r) => r + 1);
        setPhase("user_shoot");
        setBanner("Your penalty");
        window.setTimeout(() => setBanner(null), 1000);
        return;
      }

      setRound(kicksDone + 1);
      setPhase("user_shoot");
      setBanner("Your penalty");
      window.setTimeout(() => setBanner(null), 1000);
    }, 250);
  };

  const pointerPos = (e: React.PointerEvent) => {
    const el = stageRef.current;
    if (!el) return { x: e.clientX, y: e.clientY };
    const r = el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "user_shoot" && phase !== "user_keep") return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pointerPos(e);
    dragRef.current = {
      mode: phase === "user_shoot" ? "shoot" : "dive",
      x0: p.x,
      y0: p.y,
      x: p.x,
      y: p.y,
      active: true,
    };
    setGuide({ x: 0, y: 0.5, power: 0.5 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const p = pointerPos(e);
    dragRef.current.x = p.x;
    dragRef.current.y = p.y;
    const dx = p.x - dragRef.current.x0;
    const dy = p.y - dragRef.current.y0;

    if (dragRef.current.mode === "shoot") {
      // Swipe up = power/height; left-right = direction
      const x = clamp(dx / 90, -1.15, 1.15);
      const up = clamp(-dy / 110, 0, 1);
      const power = clamp(0.28 + Math.hypot(dx, dy) / 160, 0.28, 1);
      setGuide({ x, y: up, power });
    } else {
      const x = clamp(dx / 80, -1, 1);
      const y = clamp(0.5 - dy / 100, 0, 1);
      setGuide({ x, y, power: 0.5 });
      // Live keeper preview
      setKeeper({
        x: lerp(GOAL.left + 24, GOAL.right - 24, (x + 1) / 2),
        y: lerp(GOAL.bottom - 12, GOAL.top + 20, y),
        rot: x * 28,
        stretch: Math.min(1, Math.hypot(dx, dy) / 80),
        pose: "dive",
      });
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current.active || !guide) {
      dragRef.current.active = false;
      return;
    }
    const mode = dragRef.current.mode;
    dragRef.current.active = false;

    if (mode === "shoot" && phase === "user_shoot") {
      const shot: ShotAim = { x: guide.x, y: guide.y, power: guide.power };
      setGuide(null);
      const dive = aiDive(shot);
      const result = resolveShot(shot, dive, false);
      setPhase("anim_user_shot");
      runShotAnimation({
        shot,
        dive,
        result,
        onDone: () => afterUserShot(result),
      });
    } else if (mode === "dive" && phase === "user_keep") {
      const dive: DiveAim = { x: guide.x, y: guide.y };
      setGuide(null);
      const shot = aiShot();
      const result = resolveShot(shot, dive, true);
      setPhase("anim_ai_shot");
      // Reset ball to spot for AI kick
      setBall(idleBall());
      window.setTimeout(() => {
        runShotAnimation({
          shot,
          dive,
          result,
          onDone: () => afterAiShot(result, suddenDeath ? round : round, suddenDeath),
        });
      }, 180);
    } else {
      setGuide(null);
    }
  };

  if (compact) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950 to-[#0a1f14] p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          Realistic shootout
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">Penalty Shootout</h3>
        <p className="mt-1 text-xs text-slate-400">Swipe to shoot & dive · best of 5 · sudden death</p>
        <Button asChild className="mt-4 bg-emerald-500 font-semibold text-white hover:bg-emerald-400">
          <a href="/games/penalty">
            <Target className="mr-2 h-4 w-4" /> Play now
          </a>
        </Button>
      </div>
    );
  }

  const userWon = userGoals > aiGoals;
  const draw = userGoals === aiGoals;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#050d0a] shadow-2xl">
      {/* Scoreboard */}
      <div className="border-b border-white/5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-bold text-white">You</p>
            <MarksRow marks={userMarks} goals={userGoals} />
          </div>
          <div className="shrink-0 text-center">
            <p className="text-lg font-black tabular-nums text-white">
              {userGoals} – {aiGoals}
            </p>
            <p className="text-[10px] text-slate-500">
              {suddenDeath ? "Sudden death" : `Round ${Math.min(round, ROUNDS)}/${ROUNDS}`}
            </p>
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-xs font-bold text-white">Rival AI</p>
            <MarksRow marks={aiMarks} goals={aiGoals} align="right" />
          </div>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative mx-auto select-none touch-none overflow-hidden"
        style={{
          width: "100%",
          maxWidth: W,
          aspectRatio: `${W}/${H}`,
          transform: `scale(${cam.z}) translateY(${cam.y}px)`,
          transition: "transform 0.45s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current.active = false;
          setGuide(null);
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,#0c4a6e 0%,#0369a1 14%,#14532d 14.2%,#15803d 50%,#052e16 100%)",
            transform: shake ? `translate(${shake * 3}px, ${-shake * 2}px)` : undefined,
            transition: shake ? "none" : "transform 0.2s",
          }}
        >
          {/* Lights */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/12 to-transparent" />

          {/* Goal */}
          <div
            className="absolute"
            style={{
              left: GOAL.left,
              top: GOAL.top,
              width: GOAL.right - GOAL.left,
              height: GOAL.bottom - GOAL.top,
            }}
          >
            <div className="absolute inset-0 border-[3px] border-white/90 bg-sky-950/35 shadow-[0_0_50px_rgba(255,255,255,0.1)]" />
            <div
              className="absolute inset-1 opacity-50"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)",
                backgroundSize: "9px 9px",
                transform: netPulse ? `scaleY(${1 + netPulse * 0.08})` : undefined,
                transformOrigin: "top",
                transition: "transform 0.25s ease",
              }}
            />
          </div>

          {/* Penalty arc */}
          <div
            className="pointer-events-none absolute rounded-t-[50%] border border-white/20"
            style={{ left: "12%", right: "12%", bottom: 48, height: 90 }}
          />
          <div
            className="absolute rounded-full bg-white/50"
            style={{ left: SPOT.x - 6, top: SPOT.y + 6, width: 12, height: 4 }}
          />

          {/* Keeper */}
          <div
            className="absolute z-10"
            style={{
              left: keeper.x,
              top: keeper.y,
              transform: `translate(-50%, -80%) rotate(${keeper.rot}deg)`,
              transition:
                phase === "user_keep" && dragRef.current.active
                  ? "none"
                  : undefined,
            }}
          >
            <KeeperSvg pose={keeper.pose} stretch={keeper.stretch} />
          </div>

          {/* Aim guide */}
          {guide && phase === "user_shoot" && (
            <AimGuide guide={guide} />
          )}

          {/* Ball */}
          {ball.visible && (
            <div
              className="absolute z-20 will-change-transform"
              style={{
                left: ball.x,
                top: ball.y,
                width: 28,
                height: 28,
                transform: `translate(-50%, -50%) scale(${ball.scale})`,
                filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.45))",
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-400 text-base ring-2 ring-white/40">
                ⚽
              </div>
            </div>
          )}

          {/* Banner */}
          {banner && (
            <div
              className="pointer-events-none absolute inset-x-0 top-[42%] z-30 text-center text-2xl font-black tracking-wide"
              style={{
                color:
                  banner === "GOAL!"
                    ? "#6ee7b7"
                    : banner === "SAVED!"
                      ? "#fda4af"
                      : banner === "MISS!"
                        ? "#fcd34d"
                        : "#e2e8f0",
                textShadow: "0 2px 16px rgba(0,0,0,0.85)",
              }}
            >
              {banner}
            </div>
          )}

          {/* Prompts */}
          {phase === "user_shoot" && !guide && (
            <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] font-medium text-white/75">
              Drag to aim · release to shoot
            </p>
          )}
          {phase === "user_keep" && !guide && (
            <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] font-medium text-white/75">
              Swipe to dive · timing matters
            </p>
          )}
          {phase === "intro" && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/55 px-6 text-center backdrop-blur-[2px]">
              <p className="text-lg font-black text-white">Penalty Shootout</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                5 kicks each. You shoot, then dive to save. Sudden death if tied.
              </p>
              <Button
                className="mt-5 bg-emerald-500 font-semibold text-white hover:bg-emerald-400"
                onClick={startMatch}
              >
                Kick off
              </Button>
            </div>
          )}
          {phase === "done" && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 px-6 text-center backdrop-blur-[2px]">
              <p className="text-xl font-black text-white">
                {draw ? "Draw" : userWon ? "You win! 🏆" : "AI wins"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {userGoals} – {aiGoals}
                {suddenDeath ? " · Sudden death" : ""}
              </p>
              <Button
                className="mt-5 border-white/20"
                variant="outline"
                onClick={resetMatch}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Play again
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 px-3 py-2 text-center text-[10px] text-slate-500">
        {phase === "user_shoot"
          ? "Aim with drag direction · pull length = power"
          : phase === "user_keep"
            ? "Dive left / right / high / low before the ball arrives"
            : phase === "anim_user_shot" || phase === "anim_ai_shot"
              ? "…"
              : "NepARENA Arcade"}
      </div>
    </div>
  );
}

function MarksRow({
  marks,
  goals,
  align = "left",
}: {
  marks: KickResult[];
  goals: number;
  align?: "left" | "right";
}) {
  const slots = Math.max(ROUNDS, marks.length);
  return (
    <div
      className={cn(
        "mt-1 flex flex-wrap items-center gap-0.5",
        align === "right" && "justify-end",
      )}
    >
      {Array.from({ length: slots }).map((_, i) => {
        const m = marks[i];
        return (
          <span
            key={i}
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              m === "goal" && "bg-emerald-400",
              m === "save" && "bg-rose-400",
              m === "miss" && "bg-amber-400/80",
              !m && "bg-white/15",
            )}
            title={m ?? "pending"}
          />
        );
      })}
      <span className="ml-1 text-[10px] tabular-nums text-slate-500">{goals}</span>
    </div>
  );
}

function AimGuide({ guide }: { guide: { x: number; y: number; power: number } }) {
  const tx = shotTarget({ x: guide.x, y: guide.y, power: guide.power });
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-15 h-full w-full">
        <defs>
          <linearGradient id="aimGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(52,211,153,0.1)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0.7)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${SPOT.x} ${SPOT.y} Q ${lerp(SPOT.x, tx.x, 0.5)} ${tx.y - 40 - guide.power * 30} ${tx.x} ${tx.y}`}
          fill="none"
          stroke="url(#aimGrad)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      </svg>
      <div
        className="pointer-events-none absolute z-15 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300 bg-emerald-400/40"
        style={{ left: tx.x, top: tx.y }}
      />
      <div className="pointer-events-none absolute bottom-10 left-1/2 z-15 w-28 -translate-x-1/2">
        <div className="h-1 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${guide.power * 100}%` }}
          />
        </div>
        <p className="mt-0.5 text-center text-[9px] text-emerald-200/80">Power</p>
      </div>
    </>
  );
}

function KeeperSvg({ pose, stretch }: { pose: KeeperState["pose"]; stretch: number }) {
  const arm = 12 + stretch * 16;
  return (
    <div className="relative" style={{ width: 44, height: 56 }}>
      {/* gloves / arms */}
      <div
        className="absolute top-3 text-lg"
        style={{
          left: -arm * 0.35,
          transform: `rotate(${-20 - stretch * 25}deg)`,
        }}
      >
        🧤
      </div>
      <div
        className="absolute top-3 text-lg"
        style={{
          right: -arm * 0.35,
          transform: `rotate(${20 + stretch * 25}deg)`,
        }}
      >
        🧤
      </div>
      {/* body */}
      <div className="absolute left-1/2 top-2 h-7 w-7 -translate-x-1/2 rounded-full bg-gradient-to-b from-yellow-200 to-yellow-500 ring-1 ring-black/20" />
      <div className="absolute left-1/2 top-8 h-6 w-10 -translate-x-1/2 rounded-md bg-gradient-to-b from-yellow-400 to-amber-700" />
      <div className="absolute left-1/2 top-[3.25rem] flex -translate-x-1/2 gap-1">
        <div className="h-3 w-2 rounded-b bg-neutral-800" />
        <div className="h-3 w-2 rounded-b bg-neutral-800" />
      </div>
      {pose === "hold" && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 text-sm">⚽</div>
      )}
    </div>
  );
}
