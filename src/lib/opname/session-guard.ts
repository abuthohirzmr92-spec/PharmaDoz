// ---------------------------------------------------------------------------
// RC1 P0E.2 — Session Enforcement Guard
// ---------------------------------------------------------------------------
// Pure function. Zero side effects. No DB.
// ---------------------------------------------------------------------------

import { useOpnameSessionStore } from "@/store/opname-session-store";
import type { SessionStatus } from "@/types/opname-session";

export interface SessionGuardResult {
  allowed: boolean;
  reason?: string;
  /** Current session status (null if no session) */
  currentStatus: SessionStatus | null;
}

/**
 * Check if opname is allowed in current session state.
 *
 * Rules:
 *   no active session → blocked  (no session exists)
 *   paused session    → blocked  (resume first)
 *   completed session → blocked  (start new session)
 *   in_progress       → allowed ✅
 *   draft             → allowed ✅ (transition to in_progress)
 */
export function canPerformOpname(): SessionGuardResult {
  const session = useOpnameSessionStore.getState().activeSession;

  if (!session) {
    return {
      allowed: false,
      reason: "Tidak ada session aktif. Silakan mulai session terlebih dahulu.",
      currentStatus: null,
    };
  }

  if (session.status === "paused") {
    return {
      allowed: false,
      reason: "Session sedang dijeda. Silakan lanjutkan session terlebih dahulu.",
      currentStatus: "paused",
    };
  }

  if (session.status === "completed") {
    return {
      allowed: false,
      reason: "Session sudah selesai. Silakan mulai session baru.",
      currentStatus: "completed",
    };
  }

  // draft or in_progress → allowed
  return { allowed: true, currentStatus: session.status };
}
