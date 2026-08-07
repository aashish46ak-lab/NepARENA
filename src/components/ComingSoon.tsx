import React, { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

const targetIsoNPT = "2026-09-02T00:00:00+05:45"; // Sep 2, 2026 NPT

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="w-20 sm:w-24 bg-white/6 border border-white/8 backdrop-blur-md rounded-xl p-3 flex flex-col items-center justify-center animate-[fade-in_350ms_ease]">
      <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      <div className="text-[10px] uppercase mt-1 text-muted-foreground">{label}</div>
    </div>
  );
}

export default function ComingSoon() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetIsoNPT);
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / (3600 * 24));
  const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#031027] via-[#061226] to-[#02040a] text-white px-4">
      <div className="w-full max-w-3xl text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <img src="/android-chrome-512x512.png" alt="eFootball Nepal" className="h-20 w-20 rounded-2xl glow-brand" />
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-blue-400 drop-shadow-[0_10px_30px_rgba(59,130,246,0.25)]" />
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">COMING SOON</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            We're upgrading the eFootball Nepal experience. Stay tuned!
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Card label="Days" value={days} />
          <Card label="Hours" value={pad(hours)} />
          <Card label="Minutes" value={pad(minutes)} />
          <Card label="Seconds" value={pad(seconds)} />
        </div>

        <div className="text-xs text-muted-foreground">Target: Sep 2, 2026 · Nepal Time (NPT)</div>
      </div>
    </div>
  );
}
