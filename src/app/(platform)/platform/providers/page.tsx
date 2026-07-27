"use client";

import { useState, useMemo } from "react";
import { Search, CheckCircle2, AlertTriangle, XCircle, CreditCard, Repeat, Ban, Webhook } from "lucide-react";
import { AppBadge } from "@/components/ui/app-badge";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { paymentProviderRegistry } from "@/lib/billing/providers/registry";
import { integrationRegistryRepo } from "@/lib/repository-instances";
import type { ProviderCard } from "@/types/subscription-dtos";

const modeLabel = (mode: string) => mode === "production" ? "Produksi" : "Sandbox";

export default function ProvidersPage() {
  const [search, setSearch] = useState("");

  const { data, loading, error } = useAsync(async () => {
    // Load integrations for the payment category
    let integrationMap = new Map<string, { status: string; label: string }>();
    try {
      const integrations = await integrationRegistryRepo.listByCategory("payment");
      for (const i of integrations) {
        integrationMap.set(i.integrationKey, { status: i.status, label: i.label });
      }
    } catch { /* best-effort */ }

    return paymentProviderRegistry.keys().map((key) => {
      const p = paymentProviderRegistry.get(key);
      if (!p) return null;
      const caps = p.capabilities();
      const intg = integrationMap.get(key);
      return {
        key: p.key,
        methods: caps.methods,
        methodsCount: caps.methods.length,
        hasRefund: caps.supportsRefund,
        hasCancel: caps.supportsCancel,
        hasWebhook: caps.supportsWebhook,
        mode: caps.mode,
        integrationStatus: intg?.status ?? null,
        integrationLabel: intg?.label ?? null,
      };
    }).filter(Boolean) as ProviderCard[];
  }, []);

  const cards = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter((p) => p.key.toLowerCase().includes(q) || p.methods.some((m) => m.toLowerCase().includes(q)));
  }, [cards, search]);

  // Aggregate readiness
  const productionCount = cards.filter((p) => p.mode === "production").length;
  const sandboxCount = cards.filter((p) => p.mode === "sandbox").length;
  const readyCount = cards.filter((p) => p.integrationStatus === "active").length;

  return (
    <div className="space-y-4">
      {/* ── Overview bar ── */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatPill label="Provider Terdaftar" value={String(cards.length)} />
        <StatPill label="Produksi" value={String(productionCount)} />
        <StatPill label="Sandbox" value={String(sandboxCount)} />
        <StatPill label="Integrasi Aktif" value={`${readyCount} / ${cards.length}`} />
      </div>

      {/* ── Search ── */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari provider atau metode..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500 sm:w-64"
          />
        </div>
      </div>

      {/* ── Provider Cards ── */}
      <WidgetShell title={`Penyedia Pembayaran (${filtered.length})`} loading={loading} error={error} isEmpty={cards.length === 0}>
        {cards.length > 0 && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Tidak ada provider yang cocok dengan &quot;{search}&quot;.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProviderCard key={p.key} provider={p} />
            ))}
          </div>
        )}
      </WidgetShell>

      {/* ── Readiness Summary ── */}
      <WidgetShell title="Status Kesiapan Operasional" loading={false} error={null}>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((p) => {
            const readiness = p.integrationStatus === "active" ? "ready" : p.mode === "production" ? "pending" : "sandbox";
            return (
              <div key={p.key} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  {readiness === "ready" ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                    : readiness === "sandbox" ? <AlertTriangle className="h-5 w-5 text-amber-500" />
                    : <XCircle className="h-5 w-5 text-red-400" />}
                  <div>
                    <p className="text-sm font-medium capitalize text-neutral-900 dark:text-neutral-50">{p.integrationLabel ?? p.key}</p>
                    <p className="text-xs text-neutral-400">
                      {readiness === "ready" ? "Integrasi aktif — siap menerima pembayaran" :
                       readiness === "sandbox" ? `Mode ${modeLabel(p.mode)} — belum production-ready` :
                       "Integrasi perlu dikonfigurasi"}
                    </p>
                  </div>
                </div>
                <AppBadge variant={readiness === "ready" ? "success" : readiness === "sandbox" ? "warning" : "danger"}>
                  {readiness === "ready" ? "✓ Siap" : readiness === "sandbox" ? "Sandbox" : "Perlu Konfigurasi"}
                </AppBadge>
              </div>
            );
          })}
        </div>
      </WidgetShell>
    </div>
  );
}

function ProviderCard({ provider: p }: { provider: ProviderCard }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize text-neutral-900 dark:text-neutral-50">
          {p.integrationLabel ?? p.key}
        </h3>
        <AppBadge variant={p.mode === "production" ? "success" : "info"}>
          {modeLabel(p.mode)}
        </AppBadge>
      </div>

      {/* Capability matrix */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <CapBadge icon={CreditCard} label="Metode" value={String(p.methodsCount)} />
        <CapBadge icon={Webhook} label="Webhook" value={p.hasWebhook ? "✓" : "—"} active={p.hasWebhook} />
        <CapBadge icon={Repeat} label="Refund" value={p.hasRefund ? "✓" : "—"} active={p.hasRefund} />
        <CapBadge icon={Ban} label="Cancel" value={p.hasCancel ? "✓" : "—"} active={p.hasCancel} />
      </div>

      {/* Payment methods */}
      <div className="mt-3">
        <p className="mb-1 text-[11px] font-medium text-neutral-400">Metode Pembayaran</p>
        <div className="flex flex-wrap gap-1">
          {p.methods.length === 0 ? (
            <span className="text-xs text-neutral-400">—</span>
          ) : (
            p.methods.map((m) => (
              <AppBadge key={m} variant="neutral">{m.replace(/_/g, " ")}</AppBadge>
            ))
          )}
        </div>
      </div>

      {/* Integration status */}
      <div className="mt-3 rounded-lg border border-neutral-100 p-2 text-xs dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Integrasi</span>
          <AppBadge variant={p.integrationStatus === "active" ? "success" : p.integrationStatus === "sandbox" ? "info" : "neutral"}>
            {p.integrationStatus ?? "—"}
          </AppBadge>
        </div>
      </div>
    </div>
  );
}

function CapBadge({ icon: Icon, label, value, active }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2 dark:border-neutral-800">
      <Icon className={`h-3.5 w-3.5 ${active === false ? "text-neutral-300 dark:text-neutral-600" : "text-brand-500"}`} />
      <div>
        <p className="text-[10px] text-neutral-400">{label}</p>
        <p className="text-xs font-medium text-neutral-900 dark:text-neutral-50">{value}</p>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-950">
      <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
      <p className="text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}
