/** Sidebar render probe — tracks consecutive empty renders.
 *
 * Reports a finding when the sidebar is empty (navFiltered === 0) for
 * 2+ consecutive renders while the user is authenticated. */

import { diagnosticRepo } from "../repository";
import { isDiagnosticsEnabled } from "../config";

let consecutiveEmptyRenders = 0;

export function logSidebarRender(opts: {
  hasUser: boolean;
  role: string | null;
  navFiltered: number;
  navTotal: number;
}): void {
  if (!isDiagnosticsEnabled()) return;

  if (opts.hasUser && opts.navFiltered === 0) {
    consecutiveEmptyRenders += 1;
  } else {
    consecutiveEmptyRenders = 0;
  }

  if (consecutiveEmptyRenders >= 2) {
    diagnosticRepo.report({
      patternId: "empty-sidebar",
      severity: "warn",
      message:
        `Sidebar rendered empty ${consecutiveEmptyRenders} times for authenticated user ` +
        `(role="${opts.role}", navTotal=${opts.navTotal}). ` +
        "Navigation filtering removed all items.",
      timestamp: new Date().toISOString(),
      remediation:
        "Check role-to-permission mapping in ROLE_PERMISSIONS. " +
        "The user's role may not have any navigation permissions. " +
        "Or check resolveUserRole() — role may have resolved to 'unaffiliated'.",
    });
  }
}

export function resetSidebarDiagnostics(): void {
  consecutiveEmptyRenders = 0;
}
