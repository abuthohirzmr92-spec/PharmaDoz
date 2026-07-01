// =================================================================
// Correction Engine — Generic Orchestrator
// EEOS V5 — Platform Architect Approved
// =================================================================

import type {
  TransactionModule,
  TransactionCorrection,
  CorrectionDetail,
  CorrectionStatus,
  ApplyResult,
  RollbackResult,
  ICorrectionEngine,
} from "./correction-types";
import { eventBus } from "./event-bus";
import { otpService } from "../otp/otp-service";
import { appendTimelineEvent } from "./timeline-engine";

// ─── Engine Registry ───

const engineRegistry = new Map<TransactionModule, ICorrectionEngine<any, any>>();

export function registerCorrectionEngine(module: TransactionModule, engine: ICorrectionEngine<any, any>): void {
  engineRegistry.set(module, engine);
}

export function getCorrectionEngine(module: TransactionModule): ICorrectionEngine<any, any> | undefined {
  return engineRegistry.get(module);
}

// ─── Generic Helpers ───

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Check if a resource can be corrected based on time window.
 * Default: 3 days. Overridable via tenant settings.
 */
export function canBeCorrected(
  postedAt: string,
  correctionWindowDays: number = 3,
): { allowed: boolean; reason?: string; remainingHours?: number } {
  const posted = new Date(postedAt);
  const deadline = new Date(posted.getTime() + correctionWindowDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now > deadline) {
    const daysSince = Math.floor((now.getTime() - posted.getTime()) / (24 * 60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Melewati batas revisi ${correctionWindowDays} hari. Sudah ${daysSince} hari. Gunakan Retur Pembelian atau Stock Adjustment.`,
    };
  }

  const remainingMs = deadline.getTime() - now.getTime();
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

  return { allowed: true, remainingHours };
}

/**
 * Compute the next correction number for a resource.
 */
export function getNextCorrectionNumber(existingCorrections: TransactionCorrection[]): number {
  if (existingCorrections.length === 0) return 1;
  return Math.max(...existingCorrections.map((c) => c.correctionNumber)) + 1;
}

// ─── Orchestrator ───

export interface ExecuteCorrectionParams {
  module: TransactionModule;
  resource: unknown;
  details: CorrectionDetail[];
  reason: string;
  user: {
    id: string;
    name: string;
    role: string;
    ip?: string;
    device?: string;
  };
  tenantId: string;
  branchId?: string | null;
  correctionWindowDays?: number;
}

export async function executeCorrection(params: ExecuteCorrectionParams): Promise<ApplyResult> {
  const { module, resource, details, reason, user, tenantId, branchId, correctionWindowDays = 3 } = params;
  const correlationId = generateCorrelationId();

  // 1. Get engine
  const engine = getCorrectionEngine(module);
  if (!engine) {
    return { success: false, correctionId: "", error: `No correction engine registered for module: ${module}` };
  }

  try {
    // 2. Publish draft created event
    eventBus.publish({
      type: "correction.draft.created",
      correlationId,
      module,
      resourceId: (resource as any).id ?? "",
      requestedBy: user.id,
    });

    // 3. Validate permission
    const permResult = engine.validatePermission(user);
    if (!permResult.valid) {
      return { success: false, correctionId: "", error: permResult.reason ?? "Permission denied" };
    }

    // 4. Validate resource
    const resourceResult = engine.validateResource(resource);
    if (!resourceResult.valid) {
      return { success: false, correctionId: "", error: resourceResult.reason ?? "Invalid resource" };
    }

    // 5. Validate stock (module-specific)
    if (engine.validateStock) {
      const stockResult = engine.validateStock(resource, details);
      if (!stockResult.valid) {
        return { success: false, correctionId: "", error: stockResult.reason ?? "Stock validation failed" };
      }
    }

    // 6. Validate batch conflicts (module-specific)
    if (engine.validateBatchConflict) {
      const batchResult = engine.validateBatchConflict(resource, details);
      if (batchResult.hasConflict) {
        const blocker = batchResult.conflicts.find((c) => c.issue.includes("REJECT"));
        if (blocker) {
          return { success: false, correctionId: "", error: `Batch conflict: ${blocker.issue}` };
        }
      }
    }

    // 7. Validate payment (module-specific)
    if (engine.validatePayment) {
      const paymentResult = engine.validatePayment(resource, details);
      if (!paymentResult.valid) {
        return { success: false, correctionId: "", error: paymentResult.reason ?? "Payment validation failed" };
      }
    }

    // 8. Compute new state
    const newState = engine.computeNewState(resource, details);

    // 9. Apply correction (module-specific, atomic)
    eventBus.publish({
      type: "correction.apply.requested",
      correlationId,
      details,
    });

    const result = await engine.applyCorrection(resource, newState, correlationId);

    if (!result.success) {
      eventBus.publish({
        type: "correction.apply.failed",
        correlationId,
        error: result.error ?? "Unknown error",
      });
      return result;
    }

    // 10. Publish completed event
    eventBus.publish({
      type: "correction.apply.completed",
      correlationId,
      correctionId: result.correctionId,
    });

    // 11. Timeline
    appendTimelineEvent(correlationId, {
      source: "correction",
      eventType: "applied",
      createdAt: new Date().toISOString(),
      status: "applied",
      summary: `Correction applied: ${details.length} field(s) changed`,
    });

    return result;
  } catch (err: any) {
    eventBus.publish({
      type: "correction.apply.failed",
      correlationId,
      error: err?.message ?? "Unexpected error",
    });
    return { success: false, correctionId: "", error: err?.message ?? "Unexpected error during correction" };
  }
}
