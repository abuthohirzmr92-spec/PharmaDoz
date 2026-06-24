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

  // RC1 P0E.3 — ONLY in_progress is allowed. Everything else is blocked.
  if (session.status === "in_progress") {
    return { allowed: true, currentStatus: "in_progress" };
  }

  // Map remaining states to specific reasons
  const reasonMap: Record<string, string> = {
    draft: "Session masih draft. Silakan mulai session terlebih dahulu.",
    paused: "Session sedang dijeda. Silakan lanjutkan session terlebih dahulu.",
    completed: "Session sudah selesai. Silakan mulai session baru.",
  };

  return {
    allowed: false,
    reason: reasonMap[session.status] ?? `Session dalam status ${session.status}. Tidak dapat melakukan opname.`,
    currentStatus: session.status,
  };
}
