import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { PLATFORM_NAME } from "@/lib/organizers";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "neparena-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-5 left-4 right-4 z-[60] mx-auto max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#111]/95 p-4 shadow-2xl backdrop-blur-xl sm:left-auto">
      <button
        type="button"
        className="absolute right-2 top-2 text-neutral-500 hover:text-neutral-300"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <img
          src="/neparena-logo.png"
          alt=""
          className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/20"
          onError={(e) => {
            e.currentTarget.src = "/android-chrome-512x512.png";
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-100">Install {PLATFORM_NAME}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            Add to your home screen for a fast, native app experience.
          </p>
          <Button
            size="sm"
            className="mt-3 bg-neutral-100 text-black hover:bg-white"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              setVisible(false);
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Install app
          </Button>
        </div>
      </div>
    </div>
  );
}
