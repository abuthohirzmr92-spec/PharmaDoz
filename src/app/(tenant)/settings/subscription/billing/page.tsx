"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { AppBadge } from "@/components/ui/app-badge";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { invoiceRepo, paymentRepo, subscriptionRepo, promotionRepo } from "@/lib/repository-instances";
import { paymentProviderManager } from "@/lib/billing/providers/manager";
import { buildPaymentTimeline } from "@/lib/subscription/payment-timeline";
import { promoOutcome } from "@/lib/subscription/promo-evaluate";
import { paymentConfidenceMessage, paymentStatusExplanation } from "@/config/payment-descriptions";
import type { InvoiceRecord } from "@/lib/repositories/invoice";
import type { PaymentRecord } from "@/lib/repositories/payment";
import { payInvoice } from "./actions";

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const fmt = (iso: string | null | undefined) =>
  iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

const invoiceTone = (s: string) => (s === "paid" ? "success" : s === "overdue" ? "danger" : s === "canceled" ? "neutral" : "warning");
const paymentTone = (s: string) => (s === "success" ? "success" : s === "failed" ? "danger" : s === "refunded" ? "neutral" : "warning");

export default function SubscriptionBillingPage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  if (!tenantId) return <WidgetShell loading={false} error={null} isEmpty emptyText="Informasi tagihan tidak tersedia.">{null}</WidgetShell>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2"><ActiveInvoiceCenter tenantId={tenantId} /></div>
      <PaymentTimelineWidget tenantId={tenantId} />
      <PaymentConfidenceWidget />
      <PaymentHistoryWidget tenantId={tenantId} />
      <InvoiceHistoryWidget tenantId={tenantId} />
      <div className="lg:col-span-2"><PromotionCheckWidget /></div>
    </div>
  );
}

async function loadActiveInvoice(tenantId: string): Promise<InvoiceRecord | null> {
  const invoices = await invoiceRepo.listByTenant(tenantId);
  return invoices.find((i) => i.status === "overdue" || i.status === "sent" || i.status === "draft") ?? null;
}

function ActiveInvoiceCenter({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(() => loadActiveInvoice(tenantId), [tenantId]);
  const [msg, setMsg] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const pay = async () => {
    if (!data) return;
    setPaying(true);
    setMsg(null);
    try {
      const r = await payInvoice(data.id);
      setMsg(r.message);
      if (r.ok) setPaid(true);
    } finally {
      setPaying(false);
    }
  };

  return (
    <WidgetShell title="Tagihan Aktif" loading={loading} error={error} isEmpty={!data}
      emptyText="Tidak ada tagihan tertunggak. Semua lunas. 🎉">
      {data && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-neutral-500">{data.invoiceNumber}</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{rupiah(data.amount)}</p>
              <p className="text-xs text-neutral-400">Jatuh tempo: {fmt(data.dueDate)}</p>
              <p className="mt-1 text-xs text-neutral-400">Tipe: Langganan{data.notes ? ` — ${data.notes}` : ""}</p>
            </div>
            <AppBadge variant={invoiceTone(data.status)}>{data.status}</AppBadge>
          </div>
          <div className="flex gap-2">
            {!paid && (
              <button type="button" onClick={pay} disabled={paying}
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {paying ? "Memproses..." : "Bayar Sekarang"}
              </button>
            )}
            <Link href={`/settings/subscription/billing/detail/${data.id}`}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
              Lihat Detail
            </Link>
          </div>
          {msg && <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">{msg}</p>}
        </div>
      )}
    </WidgetShell>
  );
}

function PaymentConfidenceWidget() {
  const { data, loading, error } = useAsync(async () => {
    const p = await paymentProviderManager.getActiveProvider();
    return { key: p.key, confidence: paymentConfidenceMessage(p.key), methods: p.capabilities().methods };
  }, []);

  return (
    <WidgetShell title="Informasi Pembayaran" loading={loading} error={error} isEmpty={!data}>
      {data && (
        <div className="space-y-2 text-sm">
          <p className="text-neutral-700 dark:text-neutral-300">{data.confidence}</p>
          <p className="text-xs text-neutral-400">Metode ditentukan secara otomatis oleh sistem.</p>
          <div className="flex flex-wrap gap-1.5">
            {data.methods.map((m) => (<AppBadge key={m} variant="neutral">{m.replace(/_/g, " ")}</AppBadge>))}
          </div>
        </div>
      )}
    </WidgetShell>
  );
}

function PaymentTimelineWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(async () => {
    const invoices = await invoiceRepo.listByTenant(tenantId);
    const inv = invoices[0] ?? null;
    if (!inv) return null;
    let payment: PaymentRecord | null = null;
    if (inv.subscriptionId) {
      const pays = await paymentRepo.listBySubscription(inv.subscriptionId);
      payment = pays[0] ?? null;
    }
    return buildPaymentTimeline({ invoiceCreatedAt: inv.createdAt, invoiceStatus: inv.status, paymentStatus: payment?.status ?? null, paidAt: inv.paidAt ?? payment?.paidAt ?? null });
  }, [tenantId]);

  return (
    <WidgetShell title="Alur Pembayaran" loading={loading} error={error} isEmpty={!data} emptyText="Belum ada invoice.">
      {data && (
        <ol className="space-y-2">
          {data.map((s) => (
            <li key={s.step} className="flex items-center gap-2 text-sm">
              <span aria-hidden>{s.done ? "🟢" : "⚪"}</span>
              <span className={s.done ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400"}>{s.step}</span>
              {s.at && <span className="ml-auto text-xs text-neutral-400">{fmt(s.at)}</span>}
            </li>
          ))}
        </ol>
      )}
    </WidgetShell>
  );
}

function PaymentHistoryWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(async () => {
    const sub = await subscriptionRepo.getCurrent(tenantId);
    if (!sub) return [];
    return paymentRepo.listBySubscription(sub.id);
  }, [tenantId]);
  const rows = data ?? [];

  return (
    <WidgetShell title="Riwayat Pembayaran" loading={loading} error={error} isEmpty={rows.length === 0} emptyText="Belum ada pembayaran.">
      <ul className="space-y-1.5 text-sm">
        {rows.slice(0, 8).map((p) => (
          <li key={p.id} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-neutral-700 dark:text-neutral-300">{rupiah(p.amount)}</span>
              <AppBadge variant={paymentTone(p.status)}>{paymentStatusExplanation(p.status)}</AppBadge>
            </div>
            <span className="text-xs text-neutral-400">{fmt(p.paidAt ?? p.createdAt)}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

function InvoiceHistoryWidget({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useAsync(() => invoiceRepo.listByTenant(tenantId), [tenantId]);
  const rows = data ?? [];

  return (
    <WidgetShell title="Riwayat Invoice" loading={loading} error={error} isEmpty={rows.length === 0} emptyText="Belum ada invoice yang diterbitkan.">
      <ul className="space-y-1.5 text-sm">
        {rows.slice(0, 8).map((i) => (
          <li key={i.id} className="flex items-center justify-between">
            <span className="text-neutral-700 dark:text-neutral-300">{i.invoiceNumber} · {rupiah(i.amount)}</span>
            <AppBadge variant={invoiceTone(i.status)}>{i.status}</AppBadge>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

function PromotionCheckWidget() {
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<{ applied: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    if (!code) return;
    setChecking(true);
    try {
      const promo = await promotionRepo.getByCode(code);
      const o = promoOutcome(
        promo && {
          isActive: promo.isActive, validFrom: promo.validFrom, validTo: promo.validTo,
          maxRedemptions: promo.maxRedemptions, redeemedCount: promo.redeemedCount,
          appliesToPlanId: promo.appliesToPlanId, minAmount: promo.minAmount,
        },
        { nowISO: new Date().toISOString(), amount: 0, planId: null },
      );
      setOutcome({ applied: o.applied, message: o.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <WidgetShell title="Cek & Gunakan Promo" loading={false} error={null}>
      <p className="mb-2 text-xs text-neutral-400">Promo berlaku untuk langganan, upgrade, dan add-on mendatang.</p>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => { setCode(e.target.value); setOutcome(null); }} placeholder="Kode promo"
          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
        <button type="button" onClick={check} disabled={checking || !code}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300">
          {checking ? "..." : "Cek"}
        </button>
      </div>
      {outcome && (
        <p className={`mt-2 text-sm ${outcome.applied ? "text-green-600" : "text-amber-600"}`}>{outcome.message}</p>
      )}
    </WidgetShell>
  );
}
