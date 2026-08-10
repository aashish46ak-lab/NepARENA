import { QueryClient } from "@tanstack/react-query";
import {
  createRouter,
  createBrowserHistory,
  createMemoryHistory,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Single router factory used by client boot.
 * Existing Supabase schema / SQL is unchanged — only the JS boot path is new.
 */
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });

  // Always attach history so router.stores is created (required by TanStack hydrate).
  const history =
    typeof document !== "undefined"
      ? createBrowserHistory()
      : createMemoryHistory({ initialEntries: ["/"] });

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Guarantee stores exist before any hydrateStart / hydrate() call.
  const r = router as unknown as {
    stores?: { ids: { get: () => unknown[] } };
    update: (o?: object) => void;
  };
  if (!r.stores) {
    r.update({});
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
