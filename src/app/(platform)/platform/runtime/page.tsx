"use client";

import { WidgetShell } from "@/components/subscription/widget-shell";
import { AppBadge } from "@/components/ui/app-badge";
import { operationalBadge } from "@/config/operational-badges";

export default function RuntimeValidationPage() {
  const now = new Date().toLocaleString("id-ID");

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="flex items-center justify-between rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Validasi Runtime</p>
            <p className="text-xs text-neutral-500">Status infrastruktur & kesiapan produksi SLE</p>
          </div>
        </div>
        <span className="text-xs text-neutral-400">Update terakhir: {now}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MigrationStatusWidget />
        <SchedulerStatusWidget />
        <ProviderStatusWidget />
        <BillingStatusWidget />
      </div>

      {/* Production Readiness Checklist */}
      <WidgetShell title="Daftar Periksa Kesiapan Produksi" loading={false} error={null}>
        <div className="space-y-1.5 text-sm">
          {[
            { label: "Migrasi 047–073 ter-apply di staging", ok: false },
            { label: "Runtime sweep cron berjalan", ok: false },
            { label: "Webhook provider terverifikasi", ok: false },
            { label: "Payment end-to-end sukses", ok: false },
            { label: "Backfill Exception Report critical=0", ok: false },
            { label: "CR-002 (renewal RPC) dieksekusi", ok: false },
            { label: "CR-003 (webhook/promotion dedup) dieksekusi", ok: false },
            { label: "Phase 6 Owner Portal terverifikasi", ok: false },
            { label: "Phase 7 Platform Portal terverifikasi", ok: false },
          ].map((c) => (
            <div key={c.label} className="flex items-center justify-between rounded-lg border border-neutral-100 p-2 dark:border-neutral-800">
              <span className={c.ok ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-500"}>{c.label}</span>
              <AppBadge variant={c.ok ? "success" : "warning"}>{c.ok ? "✓" : "Pending"}</AppBadge>
            </div>
          ))}
        </div>
      </WidgetShell>
    </div>
  );
}

function SectionShell({ title, status, children }: { title: string; status: "healthy" | "warning" | "critical"; children: React.ReactNode }) {
  const b = operationalBadge(status);
  return (
    <WidgetShell title={title} loading={false} error={null}>
      <div className="mb-2 flex items-center gap-2">
        <AppBadge variant={b.variant as "success" | "warning" | "danger" | "neutral" | "info"}>{b.icon} {b.label}</AppBadge>
        <span className="text-xs text-neutral-400">Update terakhir: {new Date().toLocaleTimeString("id-ID")}</span>
      </div>
      {children}
    </WidgetShell>
  );
}

function MigrationStatusWidget() {
  return (
    <SectionShell title="Migrasi Database" status="warning">
      <ul className="space-y-1 text-sm">
        <li className="flex justify-between"><span>Range</span><span className="font-medium">047–073</span></li>
        <li className="flex justify-between"><span>Static validation</span><AppBadge variant="success">✓ Lulus</AppBadge></li>
        <li className="flex justify-between"><span>Runtime (staging)</span><AppBadge variant="warning">⏳ Pending</AppBadge></li>
      </ul>
    </SectionShell>
  );
}

function SchedulerStatusWidget() {
  return (
    <SectionShell title="Scheduler & Cron" status="warning">
      <ul className="space-y-1 text-sm">
        <li className="flex justify-between"><span>Subscription Sweep</span><AppBadge variant="warning">⏳ Pending</AppBadge></li>
        <li className="flex justify-between"><span>Reminder Dispatch</span><AppBadge variant="warning">⏳ Pending</AppBadge></li>
        <li className="flex justify-between"><span>vercel.json crons</span><AppBadge variant="success">✓ Siap</AppBadge></li>
      </ul>
    </SectionShell>
  );
}

function ProviderStatusWidget() {
  return (
    <SectionShell title="Penyedia Pembayaran" status="warning">
      <ul className="space-y-1 text-sm">
        <li className="flex justify-between"><span>Manual</span><AppBadge variant="success">Siap</AppBadge></li>
        <li className="flex justify-between"><span>Flip</span><AppBadge variant="warning">Experimental</AppBadge></li>
        <li className="flex justify-between"><span>Midtrans</span><AppBadge variant="warning">Experimental</AppBadge></li>
        <li className="flex justify-between"><span>Xendit</span><AppBadge variant="warning">Experimental</AppBadge></li>
      </ul>
    </SectionShell>
  );
}

function BillingStatusWidget() {
  return (
    <SectionShell title="Penagihan & Pembayaran" status="warning">
      <ul className="space-y-1 text-sm">
        <li className="flex justify-between"><span>Invoice lifecycle</span><AppBadge variant="success">✓ Siap</AppBadge></li>
        <li className="flex justify-between"><span>Payment recording</span><AppBadge variant="success">✓ Siap</AppBadge></li>
        <li className="flex justify-between"><span>End-to-end webhook</span><AppBadge variant="warning">⏳ Pending</AppBadge></li>
        <li className="flex justify-between"><span>Retry & renewal (CR-002)</span><AppBadge variant="warning">⏳ Pending</AppBadge></li>
      </ul>
    </SectionShell>
  );
}
