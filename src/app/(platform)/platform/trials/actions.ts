"use server";

import { getServiceRoleClient } from "@/lib/supabase/client-factory";
import { TrialRequestRepository } from "@/lib/repositories/trial-request";
import { provisionTenant } from "@/lib/tenant/provisioning";
import { provisionTenantService } from "@/lib/services/provision-tenant-service";
import { subscriptionRepo, packageRepo } from "@/lib/repository-instances";
import type { ProvisioningInput } from "@/types";
import type { TrialRequestRecord } from "@/lib/repositories/trial-request";

const DAY_MS = 86_400_000;
const DEFAULT_TRIAL_DAYS = 14;

async function trialRepo(): Promise<TrialRequestRepository> {
  return new TrialRequestRepository(getServiceRoleClient());
}

export async function startReview(trialId: string, reviewerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const repo = await trialRepo();
    await repo.startReview(trialId, reviewerId);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "review_failed" }; }
}

export async function approveWithPlan(
  trialId: string, reviewerId: string,
  planId?: string, durationDays?: number,
  resourceOverrides?: Record<string, unknown>,
): Promise<{ ok: boolean; tenantId?: string; error?: string }> {
  try {
    const repo = await trialRepo();

    // 1. Approve the trial request (status → approved)
    await repo.approve(trialId, {
      reviewerId, planId: planId ?? null,
      durationDays: durationDays ?? null,
      resourceOverrides: resourceOverrides ?? {},
    });

    // 2. Read the approved request to gather provisioning data
    const trial = await repo.getById(trialId) as TrialRequestRecord | null;
    if (!trial) return { ok: false, error: "Trial request tidak ditemukan setelah approval." };

    // 3. Resolve the package slug from the approved plan UUID
    const planUuid = trial.requestedPlanId;
    let packageSlug: string | undefined;
    if (planUuid) {
      const pkg = await packageRepo.getPackageById(planUuid);
      if (pkg) packageSlug = pkg.name;
    }

    // 4. Build provisioning input from trial data
    const input: ProvisioningInput = {
      ownerEmail: trial.email,
      ownerDisplayName: trial.applicantName,
      tenantName: trial.pharmacyName,
      packageSlug: packageSlug ?? "basic",
    };

    // 5. Provision the tenant (creates auth user + tenant + subscription)
    const result = await provisionTenant(input);

    if (result.status === "failure") {
      const msg = result.errors?.map((e) => e.message).join("; ") ?? "Provisioning gagal.";
      return { ok: false, error: msg };
    }

    // 6. Link the trial request to the new tenant
    const tenantId = result.tenantId;
    if (tenantId) {
      try {
        await repo.linkTenant(trialId, tenantId);
      } catch { /* best-effort: tenant is live even if metadata update fails */ }

      // 7. Schedule expiry reminders (best-effort — failures do not roll back)
      try {
        const sub = await subscriptionRepo.getCurrent(tenantId);
        if (sub) {
          const effectiveDays = trial.approvedDurationDays ?? DEFAULT_TRIAL_DAYS;
          const periodEndISO = new Date(Date.now() + effectiveDays * DAY_MS).toISOString();
          await provisionTenantService.finalize({
            tenantId: tenantId,
            subscriptionId: sub.id,
            periodEndISO,
          });
        }
      } catch { /* best-effort */ }
    }

    return { ok: true, tenantId };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "approve_failed" }; }
}

export async function rejectTrial(trialId: string, reviewerId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const repo = await trialRepo();
    await repo.reject(trialId, reviewerId, reason);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "reject_failed" }; }
}
