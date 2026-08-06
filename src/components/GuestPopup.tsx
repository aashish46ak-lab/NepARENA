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

const KEY = "efn-guest-dismissed";

export function GuestPopup() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY)) return;

    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [user, loading]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (user) return null;

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
          <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-2xl glow-brand">
            <img
              src="/android-chrome-512x512.png"
              alt="eFootball Nepal"
              className="h-full w-full object-cover"
            />
          </div>
          <DialogTitle className="text-center text-xl">
            Welcome to eFootball Nepal
          </DialogTitle>
          <DialogDescription className="text-center">
            Sign in to join tournaments, submit results, and climb the rankings.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            asChild
            className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
            onClick={dismiss}
          >
            <Link to="/auth">Log in</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-brand/40"
            onClick={dismiss}
          >
            <Link to="/auth">Sign up</Link>
          </Button>
          <Button variant="ghost" onClick={dismiss} className="w-full text-muted-foreground">
            Continue as Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
