/** Session health probe — captures storage and connectivity state.
 *
 * Inspects cookies, localStorage, Supabase connectivity, and demo mode
 * status. Emits a snapshot event to TelemetryBus. */

import { telemetryBus } from "@/lib/observability/telemetry";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode } from "@/config/env";
import { isDiagnosticsEnabled } from "../config";
import { captureStorageSnapshot } from "../capture";

export function checkSessionHealth(): void {
  if (!isDiagnosticsEnabled()) return;

  const storage = captureStorageSnapshot();

  telemetryBus.emit({
    source: "session-health",
    level: "info",
    message: "Session health check",
    metadata: {
      storage,
      supabaseConnected: isSupabaseConnected(),
      isDemo: isDemoMode(),
    },
  });
}
