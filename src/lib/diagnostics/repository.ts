import type { DiagnosticFinding, FindingSeverity } from "./types";
import { telemetryBus } from "@/lib/observability/telemetry";

const MAX_FINDINGS = 100;
const DEDUP_WINDOW_MS = 30_000;

class DiagnosticRepository {
  private findings: DiagnosticFinding[] = [];

  report(finding: Omit<DiagnosticFinding, "count">): void {
    const existing = this.findings.find(
      (f) =>
        f.patternId === finding.patternId &&
        Date.now() - new Date(f.timestamp).getTime() < DEDUP_WINDOW_MS,
    );

    if (existing) {
      existing.count = (existing.count ?? 1) + 1;
      existing.timestamp = finding.timestamp;
      return;
    }

    this.findings.push({ ...finding, count: 1 });
    if (this.findings.length > MAX_FINDINGS) {
      this.findings = this.findings.slice(-MAX_FINDINGS);
    }

    telemetryBus.emit({
      source: "diagnostic-repo",
      level: finding.severity === "critical" ? "error" : finding.severity === "error" ? "error" : finding.severity === "warn" ? "warn" : "info",
      message: `[${finding.patternId}] ${finding.message}`,
      metadata: {
        patternId: finding.patternId,
        severity: finding.severity,
        remediation: finding.remediation,
      },
    });
  }

  getFindings(): DiagnosticFinding[] {
    return [...this.findings];
  }

  getFindingsBySeverity(severity: FindingSeverity): DiagnosticFinding[] {
    return this.findings.filter((f) => f.severity === severity);
  }

  getUnresolvedFindings(): DiagnosticFinding[] {
    return this.findings.filter((f) => (f.count ?? 1) >= 2);
  }

  clear(): void {
    this.findings = [];
  }
}

export const diagnosticRepo = new DiagnosticRepository();
export { DiagnosticRepository };
