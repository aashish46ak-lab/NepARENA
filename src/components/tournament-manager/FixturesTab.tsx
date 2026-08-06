import { useMemo, useRef, useState } from "react";
import {
  supabase,
  type Match,
  type Matchday,
  type Tournament,
  type TournamentParticipant,
} from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Loader2,
  Lock,
  RefreshCw,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

// TEMP RESTORE MARKER - full file continues in next push if needed
export function FixturesTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      Restoring Fixtures tab… refresh in a moment.
    </div>
  );
}
