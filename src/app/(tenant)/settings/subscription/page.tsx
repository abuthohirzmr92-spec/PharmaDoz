"use client";

import Link from "next/link";
import { CreditCard, ArrowUpCircle, Download, LifeBuoy } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { AppCard } from "@/components/ui/app-card";
import { AppBadge } from "@/components/ui/app-badge";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { subscriptionRepo, quotaRepo, invoiceRepo } from "@/lib/repository-instances";
import { FeatureResolver } from "@/lib/features/resolver";
import { FEATURE_LABELS, type FeatureFlagKey } from "@/lib/features/registry";
import { statusDisplay } from "@/lib/subscription/status-display";
import { deriveNextAction } from "@/lib/subscription/next-action";

const DAY = 86_400_000;
const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / DAY);
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const BILLING = "/settings/subscription/billing";
const UPGRADE = "/settings/subscription/upgrade";

export default function SubscriptionOverviewPage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);

  if (!tenantId) {
    return (
      <AppCard>
        <p className="text-sm text-neutral-500">Informasi langganan tidak tersedia untuk akun ini.</p>
      </AppCard>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 1. Subscription Health Hero (Health + Next Action combined) */}
      <div className="lg:col-span-2"><SubscriptionHeroWidget tenantId={tenantId} /></div>
      {/* 3. Active Invoice */}
      <ActiveInvoiceWidget tenantId={tenantId} />
      {/* 4. Quick Actions */}
      <QuickActionsCard />
      {/* 5. Current Package */}
      <CurrentPlanWidget tenantId={tenantId} />
      {/* 6. Quota Summary */}
      <QuotaSummaryWidget tenantId={tenantId} />
      {/* 7. Current Benefits */}
      <BenefitsWidget tenantId={tenantId} />
      {/* 8. Recent Activity */}
      <div className="lg:col-span-2"><RecentActivityWidget tenantId={tenantId} /></div>
    </div>
  );
}

function SubscriptionHeroWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(async () => {
    const [sub, invoices, usage] = await Promise.all([
      subscriptionRepo.getCurrent(tenantId),
      invoiceRepo.listByTenant(tenantId),
      quotaRepo.listUsage(tenantId),
    ]);
    const endISO = sub?.lifecycleState === "trial_active" ? sub?.trialEnd : sub?.currentPeriodEnd;
    const hasOverdue = invoices.some((i) => i.status === "overdue" || i.status === "sent");
    const quotaNear = usage.some((u) => u.max != null && u.max > 0 && u.current / u.max >= 0.9);
    return {
      lifecycleState: sub?.lifecycleState ?? null,
      subscriptionType: sub?.subscriptionType ?? "—",
      daysRemaining: daysUntil(endISO),
      renewalDate: fmtDate(endISO),
      autoRenew: sub?.autoRenew ?? false,
      action: deriveNextAction({ lifecycleState: sub?.lifecycleState ?? null, daysRemaining: daysUntil(endISO), hasOverdueInvoice: hasOverdue, quotaNearLimit: quotaNear }),
      status: statusDisplay(sub?.lifecycleState ?? null),
    };
  }, [tenantId]);

  return (
    <WidgetShell loading={loading} error={error} isEmpty={!data}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>{data?.status.icon}</span>
          <div>
            <AppBadge variant={data?.status.tone ?? "neutral"}>{data?.status.icon} {data?.status.label}</AppBadge>
            <p className="mt-1 text-xs capitalize text-neutral-500">{data?.subscriptionType} · Perpanjangan {data?.renewalDate} (sisa {Math.max(0, data?.daysRemaining ?? 0)} hari)</p>
            {data?.action.kind !== "none" && (
              <div className="mt-2 flex items-center gap-2">
                <AppBadge variant={data?.action.tone ?? "neutral"}>!</AppBadge>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{data?.action.message}</p>
              </div>
            )}
          </div>
        </div>
        {data?.action.cta && data?.action.href && (
          <Link href={data.action.href} className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {data.action.cta}
          </Link>
        )}
      </div>
    </WidgetShell>
  );
}

function ActiveInvoiceWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(async () => {
    const invoices = await invoiceRepo.listByTenant(tenantId);
    return invoices.find((i) => i.status === "overdue" || i.status === "sent" || i.status === "draft") ?? null;
  }, [tenantId]);

  return (
    <WidgetShell title="Tagihan Aktif" loading={loading} error={error} isEmpty={!data} emptyText="Tidak ada tagihan tertunggak. Semua lunas. 🎉">
      {data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">{data.invoiceNumber}</span>
            <AppBadge variant={data.status === "overdue" ? "danger" : "warning"}>{data.status}</AppBadge>
          </div>
          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{rupiah(data.amount)}</p>
          <p className="text-xs text-neutral-400">Jatuh tempo: {fmtDate(data.dueDate)}</p>
          <Link href={BILLING} className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Bayar Sekarang</Link>
        </div>
      )}
    </WidgetShell>
  );
}

function QuickActionsCard() {
  const actions = [
    { label: "Bayar Sekarang", href: BILLING, icon: CreditCard },
    { label: "Upgrade Paket", href: UPGRADE, icon: ArrowUpCircle },
    { label: "Unduh Invoice", href: BILLING, icon: Download },
    { label: "Hubungi Support", href: "mailto:support@medisync.id", icon: LifeBuoy },
  ];
  return (
    <AppCard>
      <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Aksi Cepat</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label} href={a.href} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800/50">
              <Icon className="h-4 w-4 text-brand-600" />{a.label}
            </Link>
          );
        })}
      </div>
    </AppCard>
  );
}

function CurrentPlanWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(() => subscriptionRepo.getCurrent(tenantId), [tenantId]);
  const endISO = data?.lifecycleState === "trial_active" ? data?.trialEnd : data?.currentPeriodEnd;
  const remaining = daysUntil(endISO);
  return (
    <WidgetShell title="Paket Saat Ini" loading={loading} error={error} isEmpty={!data}>
      {data && (
        <div className="space-y-1.5 text-sm">
          <Row label="Tipe" value={<span className="capitalize">{data.subscriptionType ?? "—"}</span>} />
          <Row label="Sisa hari" value={remaining !== null ? `${Math.max(0, remaining)} hari` : "—"} />
          <Row label="Perpanjangan" value={fmtDate(endISO)} />
          <Row label="Auto-renew" value={<AppBadge variant={data.autoRenew ? "success" : "neutral"}>{data.autoRenew ? "Aktif" : "Nonaktif"}</AppBadge>} />
        </div>
      )}
    </WidgetShell>
  );
}

function QuotaSummaryWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(() => quotaRepo.listUsage(tenantId), [tenantId]);
  const items = (data ?? []).slice(0, 4);
  return (
    <WidgetShell title="Ringkasan Kuota" loading={loading} error={error} isEmpty={items.length === 0} emptyText="Data kuota belum tersedia.">
      <div className="space-y-2">
        {items.map((u) => {
          const pct = u.max && u.max > 0 ? Math.min(100, Math.round((u.current / u.max) * 100)) : 0;
          return (
            <div key={u.resource}>
              <div className="flex justify-between text-xs text-neutral-500">
                <span className="capitalize">{u.resource.replace(/_/g, " ")}</span>
                <span>{u.current}{u.max != null ? ` / ${u.max}` : " / ∞"}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className={pct >= 90 ? "h-1.5 rounded-full bg-red-500" : "h-1.5 rounded-full bg-brand-500"} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}

function BenefitsWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(() => FeatureResolver.getEnabledFeatures(tenantId), [tenantId]);
  const features = (data ?? []) as FeatureFlagKey[];
  return (
    <WidgetShell title="Manfaat Paket Anda" loading={loading} error={error} isEmpty={features.length === 0} emptyText="Belum ada fitur aktif.">
      <ul className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <span className="text-green-600" aria-hidden>✓</span>
            {FEATURE_LABELS[f] ?? f}
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

function RecentActivityWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(() => subscriptionRepo.getTimeline(tenantId), [tenantId]);
  const nodes = (data ?? []).slice(-5).reverse();
  return (
    <WidgetShell title="Aktivitas Terbaru" loading={loading} error={error} isEmpty={nodes.length === 0} emptyText="Belum ada aktivitas langganan.">
      <ol className="space-y-2">
        {nodes.map((n, i) => (
          <li key={`${n.eventType}-${i}`} className="flex items-center justify-between text-sm">
            <span className="capitalize text-neutral-700 dark:text-neutral-300">{n.eventType.replace(/_/g, " ")}</span>
            <span className="text-xs text-neutral-400">{fmtDate(n.createdAt)}</span>
          </li>
        ))}
      </ol>
    </WidgetShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-50">{value}</span>
    </div>
  );
}
