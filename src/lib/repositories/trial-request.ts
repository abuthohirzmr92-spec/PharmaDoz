import { BaseRepository, mapRow, mapRows } from "./base";

// ---------------------------------------------------------------------------
// TrialRequestRepository — trial intake queue (migration 056)
// ---------------------------------------------------------------------------
// Lifecycle (intake subset): pending → reviewing → approved | rejected.
// (provisioning/active/expired/converted are reflections of the subscription
//  side — see ADR-SLE-032; not enforced here.)
// Public submission is written via a service-role server route (not this repo).
// Transaction Policy: NONE (single-row updates). Approval hands off to the
// provision_tenant RPC separately.
// ---------------------------------------------------------------------------

export type TrialStatus = "pending" | "reviewing" | "approved" | "rejected";
export type TrialAction = "review" | "approve" | "reject";

const TRANSITIONS: Record<TrialAction, { from: TrialStatus[]; to: TrialStatus }> = {
  review: { from: ["pending"], to: "reviewing" },
  approve: { from: ["pending", "reviewing"], to: "approved" },
  reject: { from: ["pending", "reviewing"], to: "rejected" },
};

/** Pure: resolve the next status for an action, or null if not allowed. */
export function nextTrialStatus(current: TrialStatus, action: TrialAction): TrialStatus | null {
  const rule = TRANSITIONS[action];
  if (!rule) return null;
  return rule.from.includes(current) ? rule.to : null;
}

export interface TrialRequestRecord {
  id: string;
  applicantName: string;
  email: string;
  phone: string | null;
  pharmacyName: string;
  requestedPlanId: string | null;
  status: TrialStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  assignedTenantId: string | null;
  approvedDurationDays: number | null;
  approvedResourceOverrides: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ApproveInput {
  reviewerId: string;
  planId?: string | null;
  durationDays?: number | null;
  resourceOverrides?: Record<string, unknown>;
}

const COLS =
  "id, applicant_name, email, phone, pharmacy_name, requested_plan_id, status, " +
  "reviewed_by, reviewed_at, reject_reason, assigned_tenant_id, approved_duration_days, " +
  "approved_resource_overrides, metadata, created_at";

export class TrialRequestRepository extends BaseRepository {
  async listQueue(status?: TrialStatus): Promise<TrialRequestRecord[]> {
    if (!this.isConnected) return [];
    let query = this.client.from("trial_requests").select(COLS).order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return this.handleError(error, "TrialRequestRepository.listQueue");
    return mapRows<TrialRequestRecord>((data ?? []) as Record<string, unknown>[]);
  }

  async getById(id: string): Promise<TrialRequestRecord | null> {
    if (!this.isConnected) return null;
    const { data, error } = await this.client.from("trial_requests").select(COLS).eq("id", id).maybeSingle();
    if (error) return this.handleError(error, "TrialRequestRepository.getById");
    return data ? mapRow<TrialRequestRecord>(data as Record<string, unknown>) : null;
  }

  private async applyAction(id: string, action: TrialAction, patch: Record<string, unknown>): Promise<void> {
    const current = await this.getById(id);
    if (!current) throw new Error(`trial_request_not_found: ${id}`);
    const next = nextTrialStatus(current.status, action);
    if (!next) throw new Error(`invalid_trial_transition: ${current.status} -/-> ${action}`);

    const { error } = await this.client
      .from("trial_requests")
      .update({ status: next, updated_at: new Date().toISOString(), ...patch })
      .eq("id", id);
    if (error) return this.handleError(error, `TrialRequestRepository.${action}`);
  }

  async startReview(id: string, reviewerId: string): Promise<void> {
    return this.applyAction(id, "review", { reviewed_by: reviewerId });
  }

  async approve(id: string, input: ApproveInput): Promise<void> {
    return this.applyAction(id, "approve", {
      reviewed_by: input.reviewerId,
      reviewed_at: new Date().toISOString(),
      requested_plan_id: input.planId ?? undefined,
      approved_duration_days: input.durationDays ?? null,
      approved_resource_overrides: input.resourceOverrides ?? {},
    });
  }

  async reject(id: string, reviewerId: string, reason: string): Promise<void> {
    return this.applyAction(id, "reject", {
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    });
  }

  /** Link a tenant to an approved trial request (post-provisioning). */
  async linkTenant(id: string, tenantId: string): Promise<void> {
    if (!this.isConnected) return;
    const { error } = await this.client
      .from("trial_requests")
      .update({ assigned_tenant_id: tenantId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return this.handleError(error, "TrialRequestRepository.linkTenant");
  }
}
