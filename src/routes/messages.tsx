import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
// FILE TOO LARGE - use multi-step
export const Route = createFileRoute("/messages")({ component: () => null });
