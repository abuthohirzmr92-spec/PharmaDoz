/** Diagnostic reporter — styled console output for dev mode.
 *
 * Groups findings by severity, renders remediation text and snapshots.
 * Only outputs when NODE_ENV !== "production". */

import type { DiagnosticFinding } from "./types";

const DEV = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "color:#fff;background:#dc2626;padding:1px 6px;border-radius:3px;font-weight:700",
  error: "color:#dc2626;font-weight:700",
  warn: "color:#f59e0b;font-weight:700",
  info: "color:#3b82f6",
};

const SEVERITY_ORDER = ["critical", "error", "warn", "info"];

export function reportFindings(findings: DiagnosticFinding[]): void {
  if (!DEV) return;
  if (findings.length === 0) {
    console.log(
      "%c[DIAG] Auth Hydration — no issues detected",
      "color:#10b981;font-weight:600",
    );
    return;
  }

  const grouped = new Map<string, DiagnosticFinding[]>();
  for (const f of findings) {
    const list = grouped.get(f.severity) ?? [];
    list.push(f);
    grouped.set(f.severity, list);
  }

  console.group(
    `%c[DIAG] Auth Hydration — ${findings.length} finding${findings.length > 1 ? "s" : ""}`,
    "color:#8B5CF6;font-weight:600",
  );

  for (const severity of SEVERITY_ORDER) {
    const items = grouped.get(severity);
    if (!items || items.length === 0) continue;

    const style = SEVERITY_STYLES[severity] ?? "";
    console.group(`%c${severity.toUpperCase()} %c(${items.length})`, style, "color:#6b7280");

    for (const f of items) {
      console.log(
        `%c${f.message}`,
        severity === "critical" || severity === "error" ? "color:#ef4444" : "color:#f59e0b",
      );
      console.log(`%cRemediation: %c${f.remediation}`, "color:#6b7280", "color:#9ca3af");
      if ((f.count ?? 1) > 1) {
        console.log(`%cOccurrences: %c${f.count}`, "color:#6b7280", "");
      }
      console.log(""); // spacer
    }

    console.groupEnd();
  }

  console.groupEnd();
}

export function getDiagnosticSummary(findings: DiagnosticFinding[]): string {
  if (findings.length === 0) return "No auth issues detected.";

  const critical = findings.filter((f) => f.severity === "critical").length;
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;

  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} critical`);
  if (errors > 0) parts.push(`${errors} error`);
  if (warns > 0) parts.push(`${warns} warning`);

  return `Auth diagnostics: ${parts.join(", ")} issue${parts.length > 1 ? "s" : ""} detected.`;
}
