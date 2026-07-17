import { getServiceRoleClient } from "@/lib/supabase/client-factory";
import { createSleRepositories } from "@/lib/repository-instances";
import { ReminderService } from "./reminder-service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle-service";
import { BillingService } from "./billing-service";

// ---------------------------------------------------------------------------
// Privileged billing composition root (webhooks).
// Builds a BillingService whose repository graph is bound to the service-role
// client, so payment recording + lifecycle transitions run with privilege.
// ---------------------------------------------------------------------------
export function createPrivilegedBilling(): BillingService {
  const client = getServiceRoleClient();
  const repos = createSleRepositories(client);
  const reminderSvc = new ReminderService(repos.reminder, repos.settings);
  const lifecycle = new SubscriptionLifecycleService(repos.subscription, repos.settings, reminderSvc);
  return new BillingService(repos.invoice, repos.payment, repos.subscription, lifecycle, reminderSvc);
}
