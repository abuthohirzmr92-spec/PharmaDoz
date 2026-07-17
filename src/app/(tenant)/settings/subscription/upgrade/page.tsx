"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { packageRepo, subscriptionRepo, promotionRepo } from "@/lib/repository-instances";
import { computeProration, applyDiscount } from "@/lib/billing/calc";
import { diffAddedFeatures } from "@/lib/subscription/plan-compare";
import { promoOutcome } from "@/lib/subscription/promo-evaluate";
import { FEATURE_LABELS } from "@/lib/features/registry";
import { submitUpgradeRequest } from "./actions";

const DAY = 86_400_000;
const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

interface UpgradeOption { id: string; label: string; price: number }
interface UpgradeData {
  subscriptionId: string | null;
  options: UpgradeOption[];
  currentId: string | null;
  currentLabel: string;
  currentPrice: number;
  daysRemaining: number;
  periodDays: number;
  featuresById: Record<string, Record<string, boolean>>;
}

async function featuresMap(packageId: string): Promise<Record<string, boolean>> {
  const feats = await packageRepo.getPackageFeatures(packageId);
  const m: Record<string, boolean> = {};
  for (const f of feats) m[f.featureKey] = f.isEnabled;
  return m;
}

export default function SubscriptionUpgradePage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);

  const { data, loading, error } = useAsync<UpgradeData>(async () => {
    if (!tenantId) return { subscriptionId: null, options: [], currentId: null, currentLabel: "—", currentPrice: 0, daysRemaining: 30, periodDays: 30, featuresById: {} };
    const [rows, sub] = await Promise.all([packageRepo.getAllPackages(), subscriptionRepo.getCurrent(tenantId)]);
    const active = rows.filter((p) => p.isActive);
    const current = active.find((p) => p.id === sub?.packageId) ?? null;
    const currentPrice = current?.monthlyPrice ?? 0;
    const upgradeable = active.filter((p) => p.id !== sub?.packageId && p.monthlyPrice > currentPrice);
    const options: UpgradeOption[] = upgradeable.map((p) => ({ id: p.id, label: p.label, price: p.monthlyPrice }));

    const featuresById: Record<string, Record<string, boolean>> = {};
    if (current) featuresById[current.id] = await featuresMap(current.id);
    for (const p of upgradeable) featuresById[p.id] = await featuresMap(p.id);

    const now = Date.now();
    const end = sub?.currentPeriodEnd ? Date.parse(sub.currentPeriodEnd) : now + 30 * DAY;
    const start = sub?.currentPeriodStart ? Date.parse(sub.currentPeriodStart) : now;
    return {
      options,
      currentId: current?.id ?? null,
      currentLabel: current?.label ?? "—",
      currentPrice,
      daysRemaining: Math.max(0, Math.ceil((end - now) / DAY)),
      periodDays: Math.max(1, Math.round((end - start) / DAY)),
      featuresById,
      subscriptionId: sub?.id ?? null,
    };
  }, [tenantId]);

  const options = data?.options ?? [];
  const [selectedId, setSelectedId] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState<number | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const chosen = options.find((o) => o.id === selectedId) ?? options[0] ?? null;
  const proration = chosen && data ? computeProration(data.currentPrice, chosen.price, data.daysRemaining, data.periodDays) : 0;
  const total = discount !== null ? Math.max(0, proration - discount) : proration;

  const addedFeatures =
    chosen && data
      ? diffAddedFeatures(data.featuresById[data.currentId ?? ""] ?? {}, data.featuresById[chosen.id] ?? {})
      : [];

  const applyPromo = async () => {
    if (!promoCode || !chosen) return;
    setApplying(true);
    try {
      const promo = await promotionRepo.getByCode(promoCode);
      const outcome = promoOutcome(
        promo && {
          isActive: promo.isActive, validFrom: promo.validFrom, validTo: promo.validTo,
          maxRedemptions: promo.maxRedemptions, redeemedCount: promo.redeemedCount,
          appliesToPlanId: promo.appliesToPlanId, minAmount: promo.minAmount,
        },
        { nowISO: new Date().toISOString(), amount: proration, planId: chosen.id },
      );
      setPromoMsg(outcome.message);
      if (outcome.applied && promo) {
        const { discount: d } = applyDiscount(proration, { type: promo.type, value: promo.value, maxDiscount: promo.maxDiscount });
        setDiscount(d);
      } else {
        setDiscount(null);
      }
    } finally {
      setApplying(false);
    }
  };

  const submit = async () => {
    if (!chosen) return;
    setSubmitting(true);
    try {
      const r = await submitUpgradeRequest({ tenantId: tenantId ?? "", subscriptionId: data?.subscriptionId ?? "", toPackageId: chosen.id, promoCode: promoCode || undefined });
      setSubmitMsg(r.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WidgetShell title="Upgrade Paket" loading={loading} error={error} isEmpty={options.length === 0} emptyText="Tidak ada paket yang lebih tinggi untuk di-upgrade saat ini.">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Pilih Paket</label>
          <select value={chosen?.id ?? ""} onChange={(e) => { setSelectedId(e.target.value); setDiscount(null); setPromoMsg(null); setSubmitMsg(null); }}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
            {options.map((o) => (<option key={o.id} value={o.id}>{o.label} — {rupiah(o.price)}/bln</option>))}
          </select>
        </div>

        {/* Upgrade Impact Preview */}
        {chosen && (
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Paket saat ini</span>
              <span className="font-medium">{data?.currentLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Paket baru</span>
              <span className="font-medium text-brand-700 dark:text-brand-300">{chosen.label}</span>
            </div>
            {addedFeatures.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-neutral-500">Fitur tambahan</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {addedFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-green-700 dark:text-green-400"><span aria-hidden>+</span>{FEATURE_LABELS[f as keyof typeof FEATURE_LABELS] ?? f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setDiscount(null); setPromoMsg(null); }} placeholder="Kode promo (opsional)"
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          <button type="button" onClick={applyPromo} disabled={applying || !promoCode}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300">
            {applying ? "..." : "Terapkan"}
          </button>
        </div>
        {promoMsg && <p className={`text-sm ${discount !== null ? "text-green-600" : "text-amber-600"}`}>{promoMsg}</p>}

        <div className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <Row label="Prorata (sisa periode)" value={rupiah(proration)} />
          {discount !== null && <Row label="Diskon promo" value={`− ${rupiah(discount)}`} />}
          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">Estimasi total</span>
            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{rupiah(total)}</span>
          </div>
        </div>

        <button type="button" onClick={submit} disabled={submitting || !chosen}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {submitting ? "Memproses..." : "Ajukan Upgrade"}
        </button>
        {submitMsg && <p className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-300">{submitMsg}</p>}
      </div>
    </WidgetShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-50">{value}</span>
    </div>
  );
}
