// ---------------------------------------------------------------------------
// RC1 P0H.3A — Session Lifecycle Service (Orchestration)
// ---------------------------------------------------------------------------
// Owns: session state transitions + domain event emission.
// Store is STATE ONLY — this service is the ONLY place that publishes events.
// ---------------------------------------------------------------------------

import { useOpnameSessionStore } from "@/store/opname-session-store";
import { logSessionEvent } from "./activity-log-service";
import type { SessionAction } from "./activity-log-types";
import type { SessionOperationResult } from "./contracts/session-operation-result";

// ============================================================================
// Session Execution Context (from caller — NOT from stores)
// ============================================================================

export interface SessionExecutionContext {
  userId: string;
  tenantId: string;
  branchId: string | null;
}

// ============================================================================
// Event Emission (typed, non-blocking)
// ============================================================================

function emit(
  ctx: SessionExecutionContext,
  action: SessionAction,
  sessionId: string,
  metadata?: Record<string, unknown>,
): void {
  logSessionEvent({
    type: action,
    sessionId,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    timestamp: new Date().toISOString(),
    metadata,
  }).catch((err) => {
    console.warn("[SessionLifecycle] Failed to log event:", action, err);
  });
}

// ============================================================================
// Lifecycle Methods — all accept context from caller
// ============================================================================

export function startSessionOpname(
  ctx: SessionExecutionContext,
  title: string,
  conductedBy: string,
  selectedLocationIds: string[] = [],
  batches?: Array<{ productId: string; batchId: string; quantity: number; productName?: string; rackLocation?: string | null }>,
): string {
  const store = useOpnameSessionStore.getState();
  const id = store.startSession(title, conductedBy, selectedLocationIds, batches as any);
  if (id) {
    emit(ctx, "SESSION_STARTED", id, { title, locationIds: selectedLocationIds });
  }
  return id;
}

export function pauseSessionOpname(ctx: SessionExecutionContext): SessionOperationResult {
  const store = useOpnameSessionStore.getState();
  if (!store.activeSession) return { success: false, message: "Tidak ada session aktif." };
  store.pauseSession();
  emit(ctx, "SESSION_PAUSED", store.activeSession.id);
  return { success: true, message: "Session dijeda." };
}

export function resumeSessionOpname(ctx: SessionExecutionContext): SessionOperationResult {
  const store = useOpnameSessionStore.getState();
  if (!store.activeSession || store.activeSession.status !== "paused") return { success: false, message: "Session tidak dalam status paused." };
  store.resumeSession();
  emit(ctx, "SESSION_RESUMED", store.activeSession.id);
  return { success: true, message: "Session dilanjutkan." };
}

export function completeSessionOpname(ctx: SessionExecutionContext): SessionOperationResult {
  const store = useOpnameSessionStore.getState();
  if (!store.activeSession) return { success: false, message: "Tidak ada session aktif." };
  store.completeSession();
  const s = store.activeSession;
  emit(ctx, "SESSION_COMPLETED", s.id, { totalItems: s.totalItems, completedItems: s.completedItems });
  return { success: true, message: "Session selesai." };
}

export async function postSessionOpname(ctx: SessionExecutionContext): Promise<SessionOperationResult> {
  const store = useOpnameSessionStore.getState();
  console.log("[BUG-TRACE-1] ENTER postSessionOpname. activeSession:", !!store.activeSession, "status:", store.activeSession?.status);
  if (!store.activeSession || store.activeSession.status !== "completed") return { success: false, message: "Session belum selesai. Posting hanya bisa dilakukan setelah session completed." };

  // RC1 P0H.3G-BUGFIX — Persist opname results via shared engine
  const session = store.activeSession;
  const sessionItems = store.items.filter(i => i.status === "counted" || i.status === "skipped");
  console.log("[BUG-TRACE-2] sessionItems count:", sessionItems.length, "total items in store:", store.items.length);

  if (sessionItems.length === 0) {
    console.log("[BUG-TRACE-3] EARLY RETURN — no counted/skipped items. Calling postSession + emit.");
    store.postSession();
    emit(ctx, "SESSION_POSTED", session.id);
    return { success: true, message: "Session diposting (tidak ada item dengan selisih)." };
  }

  try {
    console.log("[BUG-TRACE-4] ENTER engine call. Loading opname-posting-engine...");
    const { postOpnameResults } = await import("@/lib/opname/opname-posting-engine");
    console.log("[BUG-TRACE-5] Engine loaded. Calling postOpnameResults with", sessionItems.length, "items...");
    const result = await postOpnameResults({
      date: session.startedAt.slice(0, 10),
      status: "confirmed",
      conductedBy: ctx.userId,   // ADR-014: UUID from execution context, NOT from session
      notes: session.notes || undefined,
      referencePrefix: "SES",
      items: sessionItems.map(i => ({
        productId: i.productId,
        productName: i.productName,
        batchId: i.batchId,
        batchNumber: i.batchNumber,
        systemQty: i.systemQty,
        physicalQty: i.physicalQty,
        difference: i.physicalQty - i.systemQty,
        note: i.note || undefined,
      })),
    });

    console.log("[BUG-TRACE-6] Engine result:", JSON.stringify({ success: result.success, opnameId: result.opnameId, error: result.error }));
    if (!result.success) {
      return { success: false, message: result.error ?? "Gagal memposting opname." };
    }

    store.postSession();
    emit(ctx, "SESSION_POSTED", session.id);
    console.log("[BUG-TRACE-7] SUCCESS — postSession called, emit called.");
    return { success: true, message: "Session diposting." };
  } catch (err: any) {
    console.error("[BUG-TRACE-ERR] CAUGHT in lifecycle:", err?.message, err);
    return { success: false, message: err?.message ?? "Gagal memposting opname." };
  }
}

export function archiveSessionOpname(ctx: SessionExecutionContext): SessionOperationResult {
  const store = useOpnameSessionStore.getState();
  if (!store.activeSession) return { success: false, message: "Tidak ada session aktif." };
  store.archiveSession();
  emit(ctx, "SESSION_ARCHIVED", store.activeSession.id);
  return { success: true, message: "Session diarsipkan." };
}

export function cancelSessionOpname(ctx: SessionExecutionContext): SessionOperationResult {
  const store = useOpnameSessionStore.getState();
  if (!store.activeSession) return { success: false, message: "Tidak ada session aktif." };
  const id = store.activeSession.id;
  store.clearSession();
  emit(ctx, "SESSION_CANCELLED", id);
  return { success: true, message: "Session dibatalkan." };
}

export function markItemCountedOpname(ctx: SessionExecutionContext, key: string, physicalQty?: number): SessionOperationResult {
  const store = useOpnameSessionStore.getState();
  if (!store.activeSession) return { success: false, message: "Tidak ada session aktif." };
  store.markItemCounted(key, physicalQty);
  emit(ctx, "ITEM_COUNTED", store.activeSession.id, { itemKey: key, physicalQty: physicalQty ?? 0 });
  return { success: true, message: "Item ditandai selesai dihitung." };
}

export function markItemsFromOpnameOpname(
  ctx: SessionExecutionContext,
  items: Array<{ productId: string; batchId: string; physicalQty: number }>,
): SessionOperationResult {
  const store = useOpnameSessionStore.getState();
  if (!store.activeSession) return { success: false, message: "Tidak ada session aktif." };
  store.markItemsFromOpname(items);
  emit(ctx, "ITEM_UPDATED", store.activeSession.id, { itemKeys: items.map(i => `${i.productId}:${i.batchId}`), count: items.length });
  return { success: true, message: `${items.length} item ditandai selesai.` };
}
