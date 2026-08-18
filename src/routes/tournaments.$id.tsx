import { createFileRoute } from "@tanstack/react-router";
import { TournamentDetailPage } from "@/components/TournamentDetailPage";

export const Route = createFileRoute("/tournaments/$id")({
  head: () => ({
    meta: [
      { title: "Tournament — NepARENA" },
      { name: "description", content: "Tournament standings, fixtures, rules and registration." },
    ],
  }),
  component: TournamentDetailPage,
});
