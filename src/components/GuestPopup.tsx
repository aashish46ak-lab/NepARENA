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
import { Trophy } from "lucide-react";

const KEY = "efn-guest-dismissed";

export function GuestPopup() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Temporarily disabled for AdSense verification
    return;

    if (loading || user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY)) return;

    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [user, loading]);

  const dismiss = () => {
    sessionStorage.setItem(KEY, "1");
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
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-gradient-brand grid place-items-center glow-brand mb-2">
            <Trophy className="h-7 w-7 text-primary-foreground" />
          </div>

          <DialogTitle className="text-center text-xl">
            Join eFootball Nepal
          </DialogTitle>

          <DialogDescription className="text-center">
            Create an account to register for tournaments, join the community,
            and appear on the Hall of Fame.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            asChild
            className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
            onClick={dismiss}
          >
            <Link to="/auth">Sign up or Log in</Link>
          </Button>

          <Button
            variant="ghost"
            onClick={dismiss}
            className="w-full"
          >
            Continue as guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
