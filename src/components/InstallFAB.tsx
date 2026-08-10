import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME } from "@/lib/organizers";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "neparena-install-fab-dismissed";

/** Always-visible floating install (bottom-left). */
export function InstallFAB() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setStandalone(alone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if (localStorage.getItem(DISMISS_KEY) === "1") setHidden(true);

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", () => {
      setDeferred(null);
      setStandalone(true);
      setOpen(false);
    });
    return () => window.removeEventListener("beforeinstallprompt", onBefore);
  }, []);

  if (standalone || hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-neutral-100 to-neutral-300 px-4 text-sm font-semibold text-black shadow-2xl ring-1 ring-white/30"
        aria-label={`Install ${PLATFORM_NAME}`}
      >
        <Download className="h-5 w-5" />
        <span className="pr-1">Install</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#111] shadow-2xl">
            <div className="flex items-start justify-between gap-3 p-5">
              <div className="flex gap-3">
                <img
                  src="/neparena-logo.png"
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/20"
                  onError={(e) => {
                    e.currentTarget.src = "/pwa-192x192.png";
                  }}
                />
                <div>
                  <p className="text-lg font-semibold text-neutral-100">
                    Install {PLATFORM_NAME}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Add to your home screen for a fast, app-like experience.
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
                  className="w-full bg-neutral-100 text-black hover:bg-white"
                  onClick={async () => {
                    await deferred.prompt();
                    await deferred.userChoice;
                    setOpen(false);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download / Install now
                </Button>
              ) : isIOS ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
                  <p className="font-medium text-neutral-100">iPhone / iPad</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-neutral-400">
                    <li>
                      Tap the <Share className="inline h-3.5 w-3.5" /> Share button
                    </li>
                    <li>Choose “Add to Home Screen”</li>
                    <li>Tap Add</li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-400">
                  <p className="font-medium text-neutral-100">Browser install</p>
                  <p className="mt-1">
                    Open the browser menu (⋮) and choose{" "}
                    <strong className="text-neutral-200">Install app</strong> or{" "}
                    <strong className="text-neutral-200">Add to Home screen</strong>.
                  </p>
                  <p className="mt-2 text-xs">
                    Chrome / Edge on Android usually show an install option after a
                    short visit.
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
