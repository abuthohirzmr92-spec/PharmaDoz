"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { subscriptionRepo, reminderRepo } from "@/lib/repository-instances";
import { applyTimelineFilters, timelineEventCounts } from "@/lib/subscription/timeline-summary";

const fmt = (iso: string | null | undefined) =>
  iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function SubscriptionActivityPage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  if (!tenantId) return <WidgetShell loading={false} error={null} isEmpty emptyText="Aktivitas tidak tersedia.">{null}</WidgetShell>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2"><TimelineWidget tenantId={tenantId} /></div>
      <div className="lg:col-span-2"><NotificationsWidget tenantId={tenantId} /></div>
    </div>
  );
}

function TimelineWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(() => subscriptionRepo.getTimeline(tenantId), [tenantId]);
  const nodes = data ?? [];
  const counts = timelineEventCounts(nodes);
  const eventTypes = Object.keys(counts).sort();
  const [filter, setFilter] = useState<string>("");
  const filtered = applyTimelineFilters(nodes, filter ? { eventTypes: [filter] } : {});

  return (
    <WidgetShell title="Riwayat Langganan" loading={loading} error={error} isEmpty={nodes.length === 0} emptyText="Belum ada aktivitas langganan.">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setFilter("")}
          className={!filter ? "rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300" : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"}>
          Semua ({nodes.length})
        </button>
        {eventTypes.map((t) => (
          <button key={t} type="button" onClick={() => setFilter(t)}
            className={filter === t ? "rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300" : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"}>
            {t.replace(/_/g, " ")} ({counts[t]})
          </button>
        ))}
      </div>
      <ol className="space-y-2">
        {filtered.map((n, i) => (
          <li key={`${n.eventType}-${n.createdAt}-${i}`} className="flex items-center justify-between text-sm">
            <span className="capitalize text-neutral-700 dark:text-neutral-300">{n.eventType.replace(/_/g, " ")}</span>
            <span className="text-xs text-neutral-400">{fmt(n.createdAt)}</span>
          </li>
        ))}
      </ol>
    </WidgetShell>
  );
}

function NotificationsWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(async () => {
    // ReminderRepo does not expose listNotifications; reuse listDue + filter own.
    // For the notification center we read notification_log directly via the
    // user client; RLS gives the tenant their own rows.
    const all = await reminderRepo.listDue(new Date().toISOString(), 20);
    return all.filter((r) => r.tenantId === tenantId).slice(0, 10);
  }, [tenantId]);

  const items = data ?? [];
  return (
    <WidgetShell title="Notifikasi" loading={loading} error={error} isEmpty={items.length === 0} emptyText="Tidak ada notifikasi. Semua baik-baik saja. ✅">
      <ul className="space-y-2 text-sm">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between">
            <span className="text-neutral-700 dark:text-neutral-300">{r.kind.replace(/_/g, " ")}</span>
            <span className="text-xs text-neutral-400">{fmt(r.scheduledFor)}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
