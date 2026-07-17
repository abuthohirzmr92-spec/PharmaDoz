import { getServiceRoleClient } from "@/lib/supabase/client-factory";
import { createSleRepositories } from "@/lib/repository-instances";
import { ReminderService } from "./reminder-service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle-service";
import { SchedulerService } from "./scheduler-service";

// ---------------------------------------------------------------------------
// Privileged scheduler composition root (cron).
// Builds a SchedulerService whose entire repository graph is bound to the
// service-role client (obtained from the Server Client Factory), so cron can
// call privileged RPCs and bypass RLS. No shared mutable global client.
// ---------------------------------------------------------------------------
export function createPrivilegedScheduler(): SchedulerService {
  const client = getServiceRoleClient();
  const repos = createSleRepositories(client);
  const reminderSvc = new ReminderService(repos.reminder, repos.settings);
  const lifecycle = new SubscriptionLifecycleService(repos.subscription, repos.settings, reminderSvc);
  return new SchedulerService(repos.schedulerRun, repos.subscription, repos.settings, lifecycle, reminderSvc);
}
