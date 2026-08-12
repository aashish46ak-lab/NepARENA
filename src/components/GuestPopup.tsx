import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const KEY = "neparena-guest-dismissed";

/**
 * Temporarily disabled while AdSense / site verification is pending.
 * Flip to true after verification to re-enable the login welcome sheet.
 */
const ENABLE_GUEST_POPUP = false;

/** Twitter-style welcome sheet for first visit as guest. */
export function GuestPopup() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ENABLE_GUEST_POPUP) return;
    if (loading || user) return;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [user, loading]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!ENABLE_GUEST_POPUP || user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) dismiss();
        else setOpen(v);
      }}
    >
      <DialogContent className="glass sm:max-w-md border-border/60">
        <DialogHeader>
          <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-white/15">
            <img
              src="/neparena-logo.png"
              alt="NepARENA"
              className="h-full w-full object-cover"
            />
          </div>
          <DialogTitle className="text-center text-xl">
            Welcome to NepARENA
          </DialogTitle>
          <DialogDescription className="text-center">
            Browse organizers, follow communities, and compete. Sign in to join
            tournaments and submit results.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            asChild
            className="w-full bg-gradient-brand text-primary-foreground"
            onClick={dismiss}
          >
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" onClick={dismiss}>
            <Link to="/auth">Sign up</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={dismiss}
            className="w-full text-muted-foreground"
          >
            Continue as guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
