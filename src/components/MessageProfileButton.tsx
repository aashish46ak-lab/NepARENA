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

/** Profile Message — open existing chat or compose first message */
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

  const openChat = async (withMessage?: string) => {
    setBusy(true);
    try {
      const cid = await getOrCreateDm(peerId);
      if (!cid) {
        toast.error("Could not start chat. Check your connection and try again.");
        return null;
      }
      if (withMessage?.trim()) {
        const res = await sendDmMessage({
          conversationId: cid,
          senderId: user.id,
          body: withMessage.trim(),
        });
        if (res.error) {
          toast.error(res.error);
        }
      }
      setOpen(false);
      setBody("");
      void navigate({ to: "/messages", search: { c: cid, with: peerId } });
      return cid;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!body.trim() || busy) return;
    await openChat(body);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-white/15"
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        {busy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
        )}
        Message
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
            placeholder="Write a message (optional)…"
            className="min-h-[100px] resize-none border-white/10 bg-black/40"
            maxLength={2000}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              className="text-neutral-300"
              onClick={() => void openChat()}
            >
              Open chat
            </Button>
            <div className="flex items-center gap-2">
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
          </div>
          <p className="text-[11px] text-neutral-500">
            If they don’t follow you, this goes to their Message Requests.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
