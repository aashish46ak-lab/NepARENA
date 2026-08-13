import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateDm, sendDmMessage } from "@/lib/dm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

/** Compose first message on profile — creates conversation only on Send */
export function MessageProfileButton({
  peerId,
  peerName,
}: {
  peerId: string;
  peerName?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user.id === peerId) return null;

  const send = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const cid = await getOrCreateDm(peerId);
      if (!cid) {
        toast.error("Could not start chat");
        return;
      }
      const res = await sendDmMessage({
        conversationId: cid,
        senderId: user.id,
        body: body.trim(),
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      setBody("");
      toast.success("Message sent");
      void navigate({ to: "/messages", search: { c: cid, with: peerId } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-white/15"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Message
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#111] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Message {peerName?.trim() || "player"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your first message…"
            className="min-h-[100px] resize-none border-white/10 bg-black/40"
            maxLength={2000}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">{body.length}/2000</span>
            <Button
              size="sm"
              disabled={busy || !body.trim()}
              onClick={() => void send()}
              className="bg-sky-500 text-white hover:bg-sky-400"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Send
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-neutral-500">
            If they don’t follow you, this goes to their Message Requests.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
