import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RoutePendingSplash } from "@/components/SplashScreen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // ssr:false routes (dashboard/platform) used to flash blank blue — show branded splash
    defaultPendingComponent: RoutePendingSplash,
    defaultPendingMs: 0,
    defaultPendingMinMs: 300,
  });

  return router;
};
