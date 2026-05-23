/** Auth hydration probe — structured replacement for [SIDEBAR-DIAG] logs.
 *
 * Tracks every step of the hydration chain with timing, status, and detail.
 * Emits structured events to TelemetryBus. Detects concurrent hydration
 * (hydrationPromise mutex reuse). */

import { telemetryBus } from "@/lib/observability/telemetry";
import { isDiagnosticsEnabled, isStepTimedOut } from "../config";
import type { ProbeStep } from "../types";
import { diagnosticRepo } from "../repository";

class AuthHydrationProbe {
  private steps: ProbeStep[] = [];
  private stepStarts = new Map<string, number>();

  startStep(name: string): void {
    if (!isDiagnosticsEnabled()) return;
    this.stepStarts.set(name, performance.now());
  }

  endStep(name: string, status: ProbeStep["status"], detail?: string): void {
    if (!isDiagnosticsEnabled()) return;
    const start = this.stepStarts.get(name);
    if (start === undefined) return;
    const durationMs = Math.round(performance.now() - start);
    this.stepStarts.delete(name);

    const step: ProbeStep = { name, durationMs, status, detail };
    this.steps.push(step);
    if (this.steps.length > 50) this.steps = this.steps.slice(-50);

    const timedOut = isStepTimedOut(name, durationMs);

    telemetryBus.emit({
      source: "auth-hydration",
      level: status === "timeout" || timedOut ? "warn" : status === "error" ? "error" : "info",
      message: `[${name}] ${status}` + (detail ? `: ${detail}` : ""),
      metadata: { stepName: name, durationMs, status, timedOut, detail },
    });
  }

  /** Called when hydrationPromise mutex is reused — signals concurrent calls. */
  reportConcurrentHydration(): void {
    if (!isDiagnosticsEnabled()) return;
    diagnosticRepo.report({
      patternId: "concurrent-hydration",
      severity: "warn",
      message: "Multiple initFromSupabaseSession calls — hydration mutex reused",
      timestamp: new Date().toISOString(),
      remediation:
        "React StrictMode double-mount or rapid navigation triggered concurrent hydration. The mutex prevents deadlock, but this may indicate unnecessary work.",
    });

    telemetryBus.emit({
      source: "auth-hydration",
      level: "warn",
      message: "Concurrent hydration detected — mutex reused",
      metadata: { patternId: "concurrent-hydration" },
    });
  }

  getSteps(): ProbeStep[] {
    return [...this.steps];
  }

  reset(): void {
    this.steps = [];
    this.stepStarts.clear();
  }
}

export const authHydrationProbe = new AuthHydrationProbe();
export { AuthHydrationProbe };
