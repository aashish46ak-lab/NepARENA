import { StartClient } from "@tanstack/react-start/client";
import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

// No StrictMode — double-mount can break hydration and look like a black-screen restart.
// PWA is disabled in __root head script + pwa-register (unregister only).
startTransition(() => {
  hydrateRoot(document, <StartClient />);
});
