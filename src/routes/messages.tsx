import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import {
  acceptDmRequest, declineDmRequest, deleteMyNote, formatMsgTime, getMyNote,
  listDmMessages, listDmThreads, listFriendNotes, markDmRead, reactToDm,
  sendDmMessage, setMyNote, deleteDmMessage, createGroupChat,
  type DmMessage, type DmThread, type UserNote,
} from "@/lib/dm";
import { parseSharedPost } from "@/lib/shared-post";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, BadgeCheck, ImagePlus, Loader2, Mic, MoreVertical, Plus, Search, Send,
  Square, StickyNote, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/upload";

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): { with?: string; c?: string } => ({
    with: typeof s.with === "string" ? s.with : undefined,
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  head: () => ({
    ...buildSeoHead({
      title: "Messages — NepARENA",
      description: "Direct messages on NepARENA",
      path: "/messages",
    }),
  }),
  component: MessagesPage,
});

// TEMP RESTORE STUB - full file next
function MessagesPage() {
  return (
    <PageShell force="platform" hideChrome>
      <div className="fixed inset-0 z-10 flex h-[100dvh] flex-col overflow-hidden bg-[#0a0a0a] pt-[env(safe-area-inset-top,0px)] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        <header className="shrink-0 border-b border-white/10 px-3 py-3">
          <h1 className="text-[15px] font-semibold text-white">Messages</h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-neutral-400">
          Loading messenger… If this stays, hard-refresh. Full UI deploying.
        </div>
      </div>
    </PageShell>
  );
}
