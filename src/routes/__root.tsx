import React, { useEffect, useState } from "react";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";

// Emergency maintenance root — minimal, self-contained, no app imports.
export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "eFootball Nepal — Maintenance" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  shellComponent: MaintenanceShell,
  component: MaintenancePage,
});

function MaintenanceShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <meta name="theme-color" content="#031027" />
        <style>{`
          /* Minimal styles for emergency maintenance page */
          html,body,#root { height: 100%; }
          body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: #031027; color: #fff; }
          .ms-container { min-height: 100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
          .ms-card { width:100%; max-width:920px; text-align:center; padding:28px; }
          .ms-logo { height:92px; width:92px; border-radius:18px; box-shadow: 0 10px 30px rgba(14,42,86,0.45); }
          .ms-title { margin-top:18px; font-weight:800; font-size:40px; letter-spacing:1px; color:#dbeafe; }
          .ms-sub { margin-top:8px; color:#93c5fd; }
          .ms-count { display:flex; gap:12px; justify-content:center; margin-top:22px; flex-wrap:wrap; }
          .ms-cell { min-width:72px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); backdrop-filter: blur(6px); padding:14px 12px; border-radius:10px; }
          .ms-num { font-size:22px; font-weight:700; color:#e0f2fe; }
          .ms-label { margin-top:6px; font-size:11px; color:#93c5fd; text-transform:uppercase; }
          @media (min-width:640px){ .ms-title{font-size:56px;} .ms-cell{min-width:96px;padding:18px 16px;} .ms-num{font-size:28px;} }
        `}</style>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetIso);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / (3600 * 24));
  const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  return { days, hours, minutes, seconds };
}

function two(n: number) { return n.toString().padStart(2, "0"); }

function MaintenancePage() {
  // Nepal Time target: Sep 2, 2026 00:00 NPT (UTC+5:45)
  const targetIso = "2026-09-02T00:00:00+05:45";
  const { days, hours, minutes, seconds } = useCountdown(targetIso);

  return (
    <div className="ms-container">
      <div className="ms-card" role="main" aria-live="polite">
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
          <img src="/android-chrome-512x512.png" alt="eFootball Nepal" className="ms-logo" />
          <h1 className="ms-title">COMING SOON</h1>
          <div className="ms-sub">We're upgrading the eFootball Nepal experience. Stay tuned!</div>
        </div>

        <div className="ms-count" aria-hidden>
          <div className="ms-cell"><div className="ms-num">{days}</div><div className="ms-label">Days</div></div>
          <div className="ms-cell"><div className="ms-num">{two(hours)}</div><div className="ms-label">Hours</div></div>
          <div className="ms-cell"><div className="ms-num">{two(minutes)}</div><div className="ms-label">Minutes</div></div>
          <div className="ms-cell"><div className="ms-num">{two(seconds)}</div><div className="ms-label">Seconds</div></div>
        </div>
      </div>
    </div>
  );
}
