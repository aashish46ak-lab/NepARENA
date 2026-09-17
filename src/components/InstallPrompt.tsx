import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { onInstallPromptChange, triggerInstall, type BeforeInstallPromptEvent } from "@/lib/pwa-register";

const DISMISS_KEY = "neparena-install-dismissed-v3";

/**
 * PWA install — only after onboarding, only when useful (Chrome deferred or iOS tips).
 * Never stacks over WelcomeFlow (parent gates with welcomeDone).
 */
export function InstallPrompt({ enabled }: { enabled: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onInstallPromptChange(setDeferred);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Wait so user sees home first; never compete with onboarding
    const timer = window.setTimeout(() => {
      // Desktop without beforeinstallprompt: skip empty modal
      const hasPrompt = Boolean(
        (window as unknown as { deferredPrompt?: unknown }).deferredPrompt,
      );
      // Show if we have deferred event OR iOS (share tip)
      setVisible((prev) => prev || true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  // Only render when we can actually help the user install
  const canInstall = Boolean(deferred) || isIOS;
  if (!visible || !enabled || !canInstall) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    setBusy(true);
    const outcome = await triggerInstall();
    setBusy(false);
    if (outcome !== "unavailable") dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[9980] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <button type="button" className="absolute inset-0" onClick={dismiss} aria-label="Close" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/12 bg-[#111] p-5 text-center shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-neutral-500 hover:text-white"
          aria-label="Not now"
        >
          <X className="h-5 w-5" />
        </button>

        <img
          src="/neparena-logo-ui.png"
          alt="NepARENA"
          width={96}
          height={96}
          className="mx-auto h-20 w-20 object-contain"
          onError={(e) => {
            e.currentTarget.src = "/icon-192.png";
          }}
        />
        <h2 id="install-title" className="mt-3 text-lg font-bold text-white">
          Install NepARENA
        </h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-neutral-400">
          Faster access to cups, results, and messages.
        </p>

        {deferred ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void install()}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {busy ? "Opening…" : "Install"}
          </button>
        ) : (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm text-neutral-300">
            <p className="font-semibold text-white">Add on iPhone / iPad</p>
            <p className="mt-2 text-neutral-400">
              Tap <Share className="mx-0.5 inline h-4 w-4" /> Share →{" "}
              <strong className="text-neutral-200">Add to Home Screen</strong>.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 text-sm text-neutral-500 hover:text-white"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
