import { StartClient } from "@tanstack/react-start/client";
import { hydrateRoot } from "react-dom/client";
import {
  StrictMode,
  startTransition,
  Suspense,
  Component,
  type ReactNode,
} from "react";

/**
 * Official TanStack Start client entry + visible Suspense / error UI.
 * Root crash was router.stores undefined during hydrateStart (fixed in router.tsx).
 */

function BootFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0a0a0a",
        color: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <img
          src="/neparena-logo.png"
          alt="NepARENA"
          width={72}
          height={72}
          style={{ borderRadius: 16, marginBottom: 16 }}
        />
        <div style={{ fontSize: 14, opacity: 0.7 }}>Loading NepARENA…</div>
      </div>
    </div>
  );
}

class BootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[NepARENA] boot error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#0a0a0a",
            color: "#f5f5f5",
            fontFamily: "system-ui, sans-serif",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 420,
              border: "1px solid #333",
              borderRadius: 16,
              padding: 24,
              background: "#111",
              textAlign: "center",
            }}
          >
            <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Boot error</h1>
            <p
              style={{
                color: "#f87171",
                fontSize: 13,
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => location.reload()}
              style={{
                marginTop: 16,
                width: "100%",
                padding: 12,
                border: 0,
                borderRadius: 10,
                background: "#f5f5f5",
                color: "#111",
                fontWeight: 600,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister();
    });
  }
} catch {
  /* ignore */
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <BootErrorBoundary>
        <Suspense fallback={<BootFallback />}>
          <StartClient />
        </Suspense>
      </BootErrorBoundary>
    </StrictMode>,
    {
      onRecoverableError(error) {
        console.error("[NepARENA] recoverable", error);
      },
    },
  );
});
