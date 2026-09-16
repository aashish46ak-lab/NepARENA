import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onInstallPromptChange, triggerInstall, type BeforeInstallPromptEvent } from "@/lib/pwa-register";

const DISMISS_KEY = "neparena-install-dismissed-v2";

export function InstallPrompt({ enabled }: { enabled: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => onInstallPromptChange(setDeferred), []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || localStorage.getItem(DISMISS_KEY) === "1") return;
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const timer = window.setTimeout(() => setVisible(true), 1600);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
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
    <div className="fixed inset-0 z-[9980] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <button type="button" className="absolute inset-0" onClick={dismiss} aria-label="Close install prompt" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/12 bg-[#111] p-6 text-center shadow-2xl">
        <button type="button" onClick={dismiss} className="absolute right-4 top-4 text-neutral-500 transition hover:text-white" aria-label="Not now">
          <X className="h-5 w-5" />
        </button>
        <div className="pointer-events-none absolute left-1/2 top-8 h-32 w-32 -translate-x-1/2 rounded-full bg-red-600/20 blur-3xl" />
        <img src="/neparena-logo-ui.png" alt="NepARENA" width={256} height={256} className="relative mx-auto h-40 w-40 object-contain" />
        <h2 id="install-title" className="mt-3 text-xl font-bold text-white">Install NepARENA</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-neutral-400">Faster access to cups, results, and messages.</p>

        {deferred ? (
          <Button className="mt-6 h-11 w-full rounded-full bg-red-600 text-white hover:bg-red-500" disabled={busy} onClick={() => void install()}>
            <Download className="mr-2 h-4 w-4" /> {busy ? "Opening…" : "Install"}
          </Button>
        ) : isIOS ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm text-neutral-300">
            <p className="font-semibold text-white">Add on iPhone or iPad</p>
            <p className="mt-2 text-neutral-400">Tap <Share className="inline h-4 w-4" /> Share, then choose <strong className="text-neutral-200">Add to Home Screen</strong>.</p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-400">Open your browser menu and choose <strong className="text-neutral-200">Install app</strong> or <strong className="text-neutral-200">Add to Home screen</strong>.</div>
        )}

        <button type="button" onClick={dismiss} className="mt-4 text-sm text-neutral-500 transition hover:text-white">Not now</button>
      </div>
    </div>
  );
}