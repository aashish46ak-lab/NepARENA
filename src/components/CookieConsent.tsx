import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "neparena-cookie-consent-v1";

/** Bottom cookie bar — delayed so it never fights splash/onboarding. */
export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* show anyway */
    }
    const t = window.setTimeout(() => setOpen(true), 2800);
    return () => window.clearTimeout(t);
  }, []);

  if (!open) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, "accepted");
    } catch {
      /* */
    }
    setOpen(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] p-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-3">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-white/12 bg-[#121214]/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center">
        <p className="flex-1 text-xs leading-relaxed text-neutral-300">
          We use cookies for login, security, analytics, and ads.{" "}
          <Link to="/privacy" className="text-sky-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
