import { useEffect, useRef, useState } from "react";
import { PLATFORM_NAME } from "@/lib/organizers";

const SESSION_KEY = "neparena_splash_seen_v2";
const TOTAL_MS = 3400;

/** Session-once: true only on first paint of a browser session */
export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
  } catch {
    /* private mode */
  }
  return true;
}

function markSplashSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Original cinematic hit — not copyrighted media */
function playCinematicHit(): { stop: () => void } {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return { stop: () => {} };
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const t0 = ctx.currentTime;

    // Deep bass impact
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(55, t0);
    osc.frequency.exponentialRampToValueAtTime(28, t0 + 0.45);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.55, t0 + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc.connect(og);
    og.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.75);

    // Metallic resonance
    const metal = ctx.createOscillator();
    metal.type = "triangle";
    metal.frequency.setValueAtTime(220, t0 + 0.02);
    metal.frequency.exponentialRampToValueAtTime(110, t0 + 0.35);
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(0.0001, t0 + 0.02);
    mg.gain.exponentialRampToValueAtTime(0.12, t0 + 0.04);
    mg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    metal.connect(mg);
    mg.connect(master);
    metal.start(t0 + 0.02);
    metal.stop(t0 + 0.45);

    // Electronic pulse
    const pulse = ctx.createOscillator();
    pulse.type = "square";
    pulse.frequency.setValueAtTime(80, t0 + 0.05);
    pulse.frequency.exponentialRampToValueAtTime(40, t0 + 0.25);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0.0001, t0 + 0.05);
    pg.gain.exponentialRampToValueAtTime(0.06, t0 + 0.07);
    pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    pulse.connect(pg);
    pg.connect(master);
    pulse.start(t0 + 0.05);
    pulse.stop(t0 + 0.32);

    // Rising tension (filtered noise-like detuned saw)
    const rise = ctx.createOscillator();
    rise.type = "sawtooth";
    rise.frequency.setValueAtTime(60, t0 + 0.15);
    rise.frequency.exponentialRampToValueAtTime(280, t0 + 1.4);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0 + 0.15);
    rg.gain.exponentialRampToValueAtTime(0.04, t0 + 0.5);
    rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(200, t0 + 0.15);
    filt.frequency.exponentialRampToValueAtTime(2400, t0 + 1.3);
    rise.connect(filt);
    filt.connect(rg);
    rg.connect(master);
    rise.start(t0 + 0.15);
    rise.stop(t0 + 1.65);

    // Master envelope
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.7, t0 + 0.03);
    master.gain.setValueAtTime(0.55, t0 + 1.8);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);

    void ctx.resume().catch(() => {});

    return {
      stop: () => {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
          window.setTimeout(() => void ctx.close().catch(() => {}), 200);
        } catch {
          /* ignore */
        }
      },
    };
  } catch {
    return { stop: () => {} };
  }
}

type Phase = "black" | "glitch" | "logo" | "glow" | "fade";

/**
 * Cinematic esports splash — once per browser session only.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<Phase>("black");
  const [visible, setVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<{ stop: () => void } | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // Preload logo
    const img = new Image();
    img.src = "/neparena-logo.png";

    const t1 = window.setTimeout(() => {
      setPhase("glitch");
      audioRef.current = playCinematicHit();
    }, 120);

    const t2 = window.setTimeout(() => setPhase("logo"), 700);
    const t3 = window.setTimeout(() => setPhase("glow"), 1600);
    const t4 = window.setTimeout(() => setPhase("fade"), 2800);
    const t5 = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      markSplashSeen();
      audioRef.current?.stop();
      setVisible(false);
      onDone?.();
    }, TOTAL_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      audioRef.current?.stop();
    };
  }, [onDone]);

  // Particle / static canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; vx: number; vy: number; life: number; r: number };
    const particles: P[] = [];
    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: Math.random(),
        r: 0.5 + Math.random() * 1.8,
      });
    }

    const draw = () => {
      if (!running) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Scan lines
      if (phase === "glitch" || phase === "logo") {
        ctx.fillStyle = "rgba(0,180,255,0.03)";
        for (let y = 0; y < h; y += 4) {
          if (Math.random() > 0.35) ctx.fillRect(0, y, w, 1);
        }
      }

      // Static noise blocks during glitch
      if (phase === "glitch") {
        for (let i = 0; i < 18; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const bw = 20 + Math.random() * 80;
          const bh = 2 + Math.random() * 8;
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,200,255,0.12)" : "rgba(255,255,255,0.08)";
          ctx.fillRect(x, y, bw, bh);
        }
        // RGB split flashes
        if (Math.random() > 0.7) {
          ctx.fillStyle = "rgba(255,0,80,0.04)";
          ctx.fillRect(2 + Math.random() * 4, 0, w, h);
          ctx.fillStyle = "rgba(0,255,255,0.04)";
          ctx.fillRect(-2 - Math.random() * 4, 0, w, h);
        }
      }

      // Floating particles (glow phase)
      if (phase === "logo" || phase === "glow" || phase === "fade") {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.life += 0.008;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          const a = 0.15 + 0.35 * Math.abs(Math.sin(p.life * 3));
          ctx.beginPath();
          ctx.fillStyle = `rgba(120, 200, 255, ${a})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [phase]);

  if (!visible) return null;

  const logoVisible = phase === "logo" || phase === "glow" || phase === "fade";
  const fading = phase === "fade";

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-black"
      style={{
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.55s ease" : undefined,
        pointerEvents: fading ? "none" : "auto",
      }}
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Center energy bloom */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            phase === "glow" || phase === "logo"
              ? "radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)"
              : "transparent",
          transition: "background 0.4s ease",
          animation: phase === "glow" ? "neparenaBloom 1.2s ease-in-out infinite" : undefined,
        }}
      />

      {/* Glitch bars */}
      {phase === "glitch" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-[28%] h-px bg-sky-400/40" style={{ animation: "neparenaFlicker 0.12s steps(2) infinite" }} />
          <div className="pointer-events-none absolute inset-x-0 top-[52%] h-0.5 bg-white/20" style={{ animation: "neparenaFlicker 0.08s steps(2) infinite reverse" }} />
          <div className="pointer-events-none absolute inset-x-0 top-[71%] h-px bg-cyan-300/30" />
        </>
      )}

      <div
        className="relative flex flex-col items-center"
        style={{
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible
            ? phase === "glow"
              ? "scale(1)"
              : "scale(1)"
            : "scale(0.85)",
          filter:
            phase === "glitch"
              ? "none"
              : phase === "logo"
                ? "drop-shadow(0 0 24px rgba(56,189,248,0.45))"
                : "drop-shadow(0 0 36px rgba(56,189,248,0.55))",
          transition:
            "opacity 0.35s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1), filter 0.4s ease",
        }}
      >
        {/* RGB ghost layers during assemble */}
        {phase === "logo" && (
          <>
            <img
              src="/neparena-logo.png"
              alt=""
              aria-hidden
              className="absolute h-[5.5rem] w-[5.5rem] rounded-[1.4rem] object-contain opacity-40 sm:h-28 sm:w-28"
              style={{ transform: "translate(-3px, 1px)", filter: "url(#none)", mixBlendMode: "screen", color: "cyan" }}
            />
            <img
              src="/neparena-logo.png"
              alt=""
              aria-hidden
              className="absolute h-[5.5rem] w-[5.5rem] rounded-[1.4rem] object-contain opacity-30 sm:h-28 sm:w-28"
              style={{ transform: "translate(3px, -1px)", mixBlendMode: "screen" }}
            />
          </>
        )}

        <div className="relative">
          <div
            className="absolute -inset-8 rounded-full"
            style={{
              background:
                phase === "glow"
                  ? "radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)",
              animation: phase === "glow" ? "neparenaPulse 1.4s ease-in-out infinite" : undefined,
            }}
          />
          <img
            src="/neparena-logo.png"
            alt={PLATFORM_NAME}
            className="relative h-[5.5rem] w-[5.5rem] rounded-[1.4rem] object-contain bg-black p-2.5 ring-1 ring-sky-400/30 sm:h-28 sm:w-28"
            style={{
              boxShadow:
                phase === "glow"
                  ? "0 0 48px rgba(56,189,248,0.35), 0 0 80px rgba(255,255,255,0.08)"
                  : "0 0 28px rgba(56,189,248,0.2)",
            }}
            onError={(e) => {
              e.currentTarget.src = "/pwa-192x192.png";
            }}
          />
          {/* Neon energy sweep */}
          {(phase === "logo" || phase === "glow") && (
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.4rem]"
              style={{ animation: "neparenaEnergy 1.1s ease-out forwards" }}
            >
              <div
                className="absolute -left-1/2 top-0 h-full w-1/2"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), rgba(56,189,248,0.4), transparent)",
                  transform: "skewX(-18deg)",
                  animation: "neparenaSweep 0.9s ease-out 0.15s forwards",
                }}
              />
            </div>
          )}
        </div>

        <h1
          className="mt-7 text-xl font-semibold tracking-[0.32em] text-white sm:text-2xl"
          style={{
            textShadow: "0 0 28px rgba(56,189,248,0.35)",
            opacity: phase === "glow" || phase === "fade" ? 1 : phase === "logo" ? 0.85 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          {PLATFORM_NAME}
        </h1>
        <p
          className="mt-2 text-[10px] font-medium uppercase tracking-[0.38em] text-sky-200/60 sm:text-[11px]"
          style={{
            opacity: phase === "glow" || phase === "fade" ? 1 : 0,
            transition: "opacity 0.45s ease 0.1s",
          }}
        >
          Esports · Nepal
        </p>
      </div>

      <style>{`
        @keyframes neparenaFlicker {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.9; transform: translateX(3px); }
        }
        @keyframes neparenaPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes neparenaBloom {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes neparenaSweep {
          0% { transform: skewX(-18deg) translateX(-20%); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: skewX(-18deg) translateX(280%); opacity: 0; }
        }
        @keyframes neparenaEnergy {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
