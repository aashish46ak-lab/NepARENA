import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const KEY = "neparena-cookie-consent-v1";

export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
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
    <div className="fixed inset-x-0 bottom-0 z-[200] p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-3">
      <div className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-white/12 bg-[#121214]/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center">
        <p className="flex-1 text-xs leading-relaxed text-neutral-300">
          We use cookies for login, security, analytics, and ads (including Google AdSense). See our{" "}
          <Link to="/privacy" className="text-sky-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <Button size="sm" className="shrink-0 rounded-full bg-sky-500 text-white" onClick={accept}>
          Got it
        </Button>
      </div>
    </div>
  );
}
