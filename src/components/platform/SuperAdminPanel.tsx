/**
 * Super Admin panel wrapper — no site chrome (Header/Footer/TopBar).
 */
import { SuperAdminPanelImpl } from "./SuperAdminPanelImpl";
import { PageShell } from "@/components/PageShell";

export function SuperAdminPanel() {
  return (
    <PageShell force="platform" hideChrome>
      <SuperAdminPanelImpl />
    </PageShell>
  );
}
