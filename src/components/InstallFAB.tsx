import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME } from "@/lib/organizers";
import {
  onInstallPromptChange,
  triggerInstall,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-register";

const DISMISS_KEY = "neparena-install-fab-dismissed";

/** Floating Install NepARENA with logo — opens native install when available. */
export function InstallFAB() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setStandalone(alone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if (localStorage.getItem(DISMISS_KEY) === "1") setHidden(true);
    return onInstallPromptChange(setDeferred);
  }, []);

  if (standalone || hidden) return null;

  const runInstall = async () => {
    setBusy(true);
    const result = await triggerInstall();
    setBusy(false);
    if (result === "accepted") {
      setOpen(false);
      setStandalone(true);
    } else if (result === "unavailable") {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void runInstall()}
        className="fixed bottom-5 left-5 z-50 flex h-14 max-w-[min(100vw-2.5rem,280px)] items-center gap-2.5 rounded-full border border-white/20 bg-[#111]/95 pl-1.5 pr-4 text-sm font-semibold text-neutral-100 shadow-2xl backdrop-blur-md"
        aria-label={`Install ${PLATFORM_NAME}`}
      >
        <img
          src="/neparena-logo.png"
          alt=""
          className="h-11 w-11 shrink-0 rounded-full object-contain bg-black p-1 ring-1 ring-white/25"
          onError={(e) => {
            e.currentTarget.src = "/pwa-192x192.png";
          }}
        />
        <span className="truncate">Install {PLATFORM_NAME}</span>
        <Download className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#111] shadow-2xl">
            <div className="flex items-start justify-between gap-3 p-5">
              <div className="flex gap-3">
                <img
                  src="/neparena-logo.png"
                  alt=""
                  className="h-14 w-14 rounded-2xl object-contain bg-black p-1.5 ring-1 ring-white/20"
                  onError={(e) => {
                    e.currentTarget.src = "/pwa-192x192.png";
                  }}
                />
                <div>
                  <p className="text-lg font-semibold text-neutral-100">
                    Install {PLATFORM_NAME}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Add to your home screen — works offline-friendly like a native app.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-neutral-500 hover:text-neutral-300"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-5 pb-5">
              {deferred ? (
                <Button
                  disabled={busy}
                  className="w-full bg-neutral-100 text-black hover:bg-white"
                  onClick={() => void runInstall()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Install now
                </Button>
              ) : isIOS ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
                  <p className="font-medium text-neutral-100">iPhone / iPad</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-neutral-400">
                    <li>
                      Tap <Share className="inline h-3.5 w-3.5" /> <strong>Share</strong>
                    </li>
                    <li>
                      Scroll and tap <strong>Add to Home Screen</strong>
                    </li>
                    <li>
                      Tap <strong>Add</strong>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-400">
                  <p className="font-medium text-neutral-100">Install from browser menu</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                    <li>
                      Open the <strong className="text-neutral-200">⋮</strong> (three dots) menu
                    </li>
                    <li>
                      Tap <strong className="text-neutral-200">Install app</strong> or{" "}
                      <strong className="text-neutral-200">Add to Home screen</strong>
                    </li>
                  </ol>
                  <p className="mt-3 text-xs text-neutral-500">
                    Chrome / Edge on Android: visit the site once, then install appears.
                    Use HTTPS (neparena.xyz). If you dismissed install earlier, clear site
                    data and reopen.
                  </p>
                </div>
              )}

              <button
                type="button"
                className="w-full text-center text-xs text-neutral-600 hover:text-neutral-400"
                onClick={() => {
                  localStorage.setItem(DISMISS_KEY, "1");
                  setHidden(true);
                  setOpen(false);
                }}
              >
                Don’t show again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
