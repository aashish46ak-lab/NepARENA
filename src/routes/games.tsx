import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for /games/*
 * Lobby lives in games.index.tsx; individual games are child routes.
 */
export const Route = createFileRoute("/games")({
  component: GamesLayout,
});

function GamesLayout() {
  return <Outlet />;
}
