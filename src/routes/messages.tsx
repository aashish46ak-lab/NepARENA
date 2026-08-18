import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import {
  formatMsgTime,
  getMyNote,
  getOrCreateDm,
  listDmMessages,
  listDmThreads,
  listFriendNotes,
  markDmRead,
  sendDmMessage,
  deleteDmMessage,
  type DmMessage,
  type DmThread,
  type UserNote,
} from "@/lib/dm";
import { listActiveOrganizers, type Organizer } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ImagePlus,
  Loader2,
  MessageCircle,
  Mic,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Square,
  Trash2,
  User as UserIcon,
  Volume2,
  X,
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

// FILE CONTINUES - this is a partial to test; will replace with full
function MessagesPage() {
  return (
    <PageShell force="platform" hideChrome>
      <div className="grid min-h-[50vh] place-items-center text-neutral-400">Loading messages…</div>
    </PageShell>
  );
}
