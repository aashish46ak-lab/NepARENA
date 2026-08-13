import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /members and /members/$id — list lives in members.index.tsx */
export const Route = createFileRoute("/members")({
  component: MembersLayout,
});

function MembersLayout() {
  return <Outlet />;
}
