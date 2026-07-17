import { trialRequestRepo, settingsRepo } from "@/lib/repository-instances";
import { reminderService } from "./reminder-service";
import type { TrialRequestRecord } from "@/lib/repositories/trial-request";

// ---------------------------------------------------------------------------
// ProvisionTenantService — trial approval → tenant provisioning handoff
// ---------------------------------------------------------------------------
// Orchestration only. Actual tenant + auth-user + subscription creation is
// performed by the existing server action (src/lib/tenant/provisioning.ts) via
// the provision_tenant RPC — NOT duplicated here. This service resolves the
// trial plan/duration from the approved request + config, and finalizes
// post-provision scheduling (reminders). Reuse-first.
// ---------------------------------------------------------------------------

export interface ResolvedTrialPlan {
  planId: string | null;         // approved request plan, else config default (null if neither)
  durationDays: number;          // approved override, else config default
  resourceOverrides: Record<string, unknown>;
}

/**
 * Pure: resolve the effective trial plan/duration/overrides for an approved
 * request, falling back to config defaults. Config default plan is passed in
 * (read from subscription_settings by the caller) to keep this pure.
 */
export function resolveTrialPlan(
  req: Pick<TrialRequestRecord, "requestedPlanId" | "approvedDurationDays" | "approvedResourceOverrides">,
  configDefaultPlanId: string | null,
  configDefaultDurationDays: number,
): ResolvedTrialPlan {
  return {
    planId: req.requestedPlanId ?? configDefaultPlanId,
    durationDays: req.approvedDurationDays ?? configDefaultDurationDays,
    resourceOverrides: req.approvedResourceOverrides ?? {},
  };
}

export class ProvisionTenantService {
  /** Resolve the effective trial plan for an approved request (config-driven). */
  async resolvePlanForRequest(requestId: string): Promise<ResolvedTrialPlan | null> {
    const req = await trialRequestRepo.getById(requestId);
    if (!req || req.status !== "approved") return null;

    const defaultDuration = await settingsRepo.getNumber("trial.default_duration_days", "days", 14);
    const defaultPlanObj = await settingsRepo.getObject("trial.default_plan_key");
    const defaultPlanId = typeof defaultPlanObj?.plan === "string" ? defaultPlanObj.plan : null;

    return resolveTrialPlan(req, defaultPlanId, defaultDuration);
  }

  /**
   * Finalize provisioning AFTER the tenant + subscription exist (created by the
   * existing provisioning server action). Schedules expiry reminders.
   * Best-effort: failures here do not roll back the live tenant.
   */
  async finalize(input: { tenantId: string; subscriptionId: string; periodEndISO: string }): Promise<void> {
    await reminderService.scheduleForSubscription(input);
  }
}

export const provisionTenantService = new ProvisionTenantService();
