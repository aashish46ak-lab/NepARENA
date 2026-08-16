import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateDm } from "@/lib/dm";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

/** Profile Message — open Messages app chat with this user (no intermediate dialog). */
export function MessageProfileButton({
  peerId,
  peerName,
  userId,
  name,
}: {
  peerId?: string;
  peerName?: string;
  /** @deprecated use peerId */
  userId?: string;
  /** @deprecated use peerName */
  name?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const targetId = peerId || userId;

  if (!user || !targetId || user.id === targetId) return null;

  const openChat = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const cid = await getOrCreateDm(targetId);
      if (!cid) {
        toast.error("Could not start chat. Check connection / try again.");
        return;
      }
      await navigate({
        to: "/messages",
        search: { c: cid, with: targetId },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start chat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-full border-white/15"
      disabled={busy}
      onClick={() => void openChat()}
      aria-label={peerName || name ? `Message ${peerName || name}` : "Message"}
    >
      {busy ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
      )}
      Message
    </Button>
  );
}
