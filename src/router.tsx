import { QueryClient } from "@tanstack/react-query";
import {
  createRouter,
  createBrowserHistory,
  createMemoryHistory,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Boot error was:
 *   Cannot read properties of undefined (reading 'get')
 * from hydrateStart():
 *   if (!router.stores.ids.get().length) await hydrate(router)
 *
 * createRouter() only builds `router.stores` when a history + latestLocation exist.
 * In production client builds, history sometimes was not ready → stores undefined → .get crash.
 * Explicit history fixes that (localhost vite path often differed).
 */
export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  const history =
    typeof document !== "undefined"
      ? createBrowserHistory()
      : createMemoryHistory({
          initialEntries: ["/"],
        });

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
