import { QueryClient } from "@tanstack/react-query";
import {
  createRouter,
  createBrowserHistory,
  createMemoryHistory,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Fewer duplicate network round-trips across navigations
        staleTime: 60_000,
        gcTime: 10 * 60_000,
      },
    },
  });

  const history =
    typeof document !== "undefined"
      ? createBrowserHistory()
      : createMemoryHistory({ initialEntries: ["/"] });

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

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
