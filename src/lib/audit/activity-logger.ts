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
    console.log("[AUDIT-DIAG] supabase connected:", !!supabase);
    if (!supabase) return;

    const { useAuthStore } = await import("@/store/auth-store");
    const user = useAuthStore.getState().user;
    console.log("[AUDIT-DIAG] user:", user ? { id: user.id, tenantId: user.tenantId, role: user.role } : null);
    if (!user) return;

    const { useBranchStore } = await import("@/store/branch-store");
    const activeBranch = useBranchStore.getState().activeBranch;
    console.log("[AUDIT-DIAG] activeBranch:", activeBranch?.id ?? null);

    const row = {
      tenant_id: user.tenantId ?? null,
      actor_id: user.id,
      pharmacy_id: activeBranch?.id ?? null,
      action: payload.action,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId,
      metadata: {
        ...payload.metadata,
        reference: payload.reference,
        severity: payload.severity ?? "info",
        sequence: ++_seq,
      },
    };
    console.log("[AUDIT-DIAG] inserting row:", JSON.stringify(row, null, 2));

    const { data, error } = await (supabase as any)
      .from("activity_logs")
      .insert(row)
      .select();

    console.log("[AUDIT-DIAG] insert result — data:", data, "error:", error);
    if (error) console.error("[AUDIT-DIAG] INSERT FAILED:", error.code, error.message, error.details);
  } catch (err) {
    console.error("[AUDIT-DIAG] CATCH:", err);
  }
}
