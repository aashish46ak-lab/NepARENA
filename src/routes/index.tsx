/**
 * NepARENA = PLATFORM PROFILE homepage.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_NAME } from "@/lib/organizers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { GamesHub } from "@/components/GamesHub";
import { StreakAssistant } from "@/components/StreakAssistant";
import { HomeStreakBadge } from "@/components/HomeStreakBadge";
import { OrganizerCard } from "@/components/OrganizerCard";
import { buildSeoHead } from "@/lib/seo";
import {
  Users,
  Building2,
  Trophy,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Mail,
} from "lucide-react";

const GoatVoteBooth = lazy(() =>
  import("@/components/GoatVoteBooth").then((m) => ({ default: m.GoatVoteBooth })),
);
const ThisOrThatBooth = lazy(() =>
  import("@/components/ThisOrThatBooth").then((m) => ({ default: m.ThisOrThatBooth })),
);
const BeAnOrganizer = lazy(() =>
  import("@/components/BeAnOrganizer").then((m) => ({ default: m.BeAnOrganizer })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    ...buildSeoHead({
      title: "NepARENA – Worldwide Multi Organizer Esports Platform",
      description:
        "NepARENA is a worldwide multi-organizer esports platform where tournament organizers manage competitions, members, communities and events.",
      path: "/",
    }),
  }),
  component: PlatformProfilePage,
});
