"use client";

import { useAuthStore } from "@/store/auth-store";
import { AppBadge } from "@/components/ui/app-badge";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { quotaRepo } from "@/lib/repository-instances";
import { resourceHealth, type ResourceHealthDatum, healthSummary } from "@/lib/subscription/resource-health";

const rLabel: Record<string, string> = { users: "Pengguna", branches: "Cabang", cashiers: "Kasir", products: "Produk", suppliers: "Pemasok", customers: "Pelanggan", storage_mb: "Penyimpanan (MB)", api_calls_monthly: "API Calls", ai_requests_monthly: "AI Requests" };

const healthTone = (h: string) => (h === "ok" ? "success" : h === "near" ? "warning" : "danger");

export default function SubscriptionUsagePage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  if (!tenantId) return <WidgetShell loading={false} error={null} isEmpty emptyText="Informasi kuota tidak tersedia.">{null}</WidgetShell>;

  return (
    <div className="space-y-4">
      <QuotaDashboard tenantId={tenantId} />
    </div>
  );
}

function QuotaDashboard({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(async () => {
    const usage = await quotaRepo.listUsage(tenantId);
    return usage.map((u) => resourceHealth(u.resource, u.current, u.max));
  }, [tenantId]);
  const rows: ResourceHealthDatum[] = data ?? [];
  const summary = healthSummary(rows);

  return (
    <WidgetShell title="Dashboard Kuota" loading={loading} error={error} isEmpty={rows.length === 0}>
      {/* Health summary */}
      <div className="mb-4 flex gap-3 text-sm">
        <AppBadge variant="success">{summary.ok} OK</AppBadge>
        <AppBadge variant="warning">{summary.near} Mendekati</AppBadge>
        <AppBadge variant="danger">{summary.critical} Kritis</AppBadge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.resource} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{rLabel[r.resource] ?? r.resource}</span>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">{r.current}{r.max != null ? ` / ${r.max}` : " / ∞"}</span>
                <AppBadge variant={healthTone(r.health)}>{r.health}</AppBadge>
              </div>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className={r.health === "critical" ? "h-2 rounded-full bg-red-500" : r.health === "near" ? "h-2 rounded-full bg-amber-500" : "h-2 rounded-full bg-brand-500"}
                style={{ width: `${Math.min(100, (r.pct ?? 0) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
