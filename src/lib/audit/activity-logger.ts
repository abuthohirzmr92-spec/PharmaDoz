// ---------------------------------------------------------------------------
// Activity Logger — Non-Blocking Audit Trail
// ---------------------------------------------------------------------------
// Logs business events to activity_logs table. Async, never blocks the caller.
// Failed logs are console.error'd and silently ignored.
// ---------------------------------------------------------------------------

interface LogPayload {
  action: string;
  resourceType: string;
  resourceId: string;
  reference: string;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
}

let _seq = 0;

export async function logActivity(payload: LogPayload): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    if (!supabase) return;

    const { useAuthStore } = await import("@/store/auth-store");
    const user = useAuthStore.getState().user;
    if (!user) return;

    await (supabase as any).from("activity_logs").insert({
      tenant_id: user.tenantId ?? null,
      actor_id: user.id,
      action: payload.action,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId,
      metadata: {
        ...payload.metadata,
        reference: payload.reference,
        severity: payload.severity ?? "info",
        sequence: ++_seq,
      },
    });
  } catch (err) {
    console.error("[AUDIT]", err);
  }
}
