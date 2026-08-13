import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateDm } from "@/lib/dm";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

/** Opens DM with peer — no confirmation */
export function MessageProfileButton({ peerId }: { peerId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!user || user.id === peerId) return null;

  const open = async () => {
    setBusy(true);
    const cid = await getOrCreateDm(peerId);
    setBusy(false);
    if (!cid) {
      toast.error("Could not open chat — run SQL 26 or sign in again");
      return;
    }
    void navigate({ to: "/messages", search: { c: cid, with: peerId } });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-white/15"
      disabled={busy}
      onClick={() => void open()}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Message
        </>
      )}
    </Button>
  );
}
