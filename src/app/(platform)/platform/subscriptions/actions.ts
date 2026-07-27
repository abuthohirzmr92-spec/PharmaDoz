"use server";

import { getServiceRoleClient } from "@/lib/supabase/client-factory";

export async function suspendSubscription(subscriptionId: string, actorId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getServiceRoleClient();
    await client.rpc("subscription_transition", {
      p_subscription_id: subscriptionId,
      p_to_state: "suspended",
      p_correlation_id: `admin:suspend:${subscriptionId}:${Date.now()}`,
      p_event_type: "suspended",
      p_actor_id: actorId, p_source: "manual", p_reason: "admin_suspend",
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "suspend_failed" }; }
}

export async function reactivateSubscription(subscriptionId: string, actorId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getServiceRoleClient();
    await client.rpc("subscription_transition", {
      p_subscription_id: subscriptionId,
      p_to_state: "active",
      p_correlation_id: `admin:reactivate:${subscriptionId}:${Date.now()}`,
      p_event_type: "reactivated",
      p_actor_id: actorId, p_source: "manual", p_reason: "admin_reactivate",
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "reactivate_failed" }; }
}

export async function cancelSubscription(subscriptionId: string, actorId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getServiceRoleClient();
    await client.rpc("subscription_transition", {
      p_subscription_id: subscriptionId,
      p_to_state: "terminated",
      p_correlation_id: `admin:cancel:${subscriptionId}:${Date.now()}`,
      p_event_type: "canceled",
      p_actor_id: actorId, p_source: "manual", p_reason: "admin_cancel",
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "cancel_failed" }; }
}
