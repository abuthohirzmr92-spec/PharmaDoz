"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { usePackageStore } from "@/store/package-store";
import { useAuthStore } from "@/store/auth-store";
import { isSystemRole } from "@/lib/auth/permissions";
import { ALL_FEATURE_KEYS, FEATURE_LABELS } from "@/lib/features/registry";
import type { TenantDetail, TenantSummary } from "@/types";
import type { PackageRow } from "@/lib/repositories/package";
import { Shield, ChevronLeft, Building2, Users, Store, Package, ArrowUpCircle, ArrowDownCircle, Ban, RotateCw, XCircle, Clock } from "lucide-react";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));
}

function formatRupiah(n: number): string {
  if (n === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;
  const { user } = useAuthStore();
  const { tenants, loadTenants, changeSubscription, suspendSubscription, reactivateSubscription, cancelSubscription, getSubscriptionHistory, isLoading } = useSuperAdminStore();
  const { packages, loadPackages } = usePackageStore();

  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [actioning, setActioning] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (tenants.length === 0) loadTenants();
    if (packages.length === 0) loadPackages();
  }, []);

  useEffect(() => {
    const t = tenants.find((t) => t.pharmacyId === tenantId);
    setTenant(t ?? null);
  }, [tenants, tenantId]);

  useEffect(() => {
    if (tenantId) {
      getSubscriptionHistory(tenantId).then(setEvents);
    }
  }, [tenantId]);

  if (!user || !isSystemRole(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-8 w-8 text-neutral-400 mb-3" />
        <h2 className="text-sm font-semibold text-neutral-700">Akses Ditolak</h2>
      </div>
    );
  }

  if (!tenant && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-neutral-500">Tenant tidak ditemukan.</p>
        <Link href="/platform/tenants" className="mt-3 text-sm text-brand-600 hover:text-brand-700">Kembali</Link>
      </div>
    );
  }

  const currentPkg = packages.find((p) => p.id === (tenant as any)?.packageId || p.name === tenant?.packageName);
  const enabledFeatures = Object.entries(currentPkg?.feature_flags ?? {}).filter(([, v]) => v).map(([k]) => k);

  const handleChange = async (newPackageId: string) => {
    setActioning("change");
    const ok = await changeSubscription(tenantId, newPackageId);
    if (ok) {
      await loadTenants();
      await getSubscriptionHistory(tenantId).then(setEvents);
      setShowChangeModal(false);
    } else setError("Gagal mengubah paket.");
    setActioning("");
  };

  const handleSuspend = async () => {
    if (!window.confirm("Suspend langganan tenant ini?")) return;
    setActioning("suspend");
    await suspendSubscription(tenantId);
    await getSubscriptionHistory(tenantId).then(setEvents);
    setActioning("");
  };

  const handleReactivate = async () => {
    setActioning("reactivate");
    await reactivateSubscription(tenantId);
    await getSubscriptionHistory(tenantId).then(setEvents);
    setActioning("");
  };

  const handleCancel = async () => {
    if (!window.confirm("Batalkan langganan tenant ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setActioning("cancel");
    await cancelSubscription(tenantId);
    await getSubscriptionHistory(tenantId).then(setEvents);
    setActioning("");
  };

  const eventIcons: Record<string, React.ElementType> = {
    upgraded: ArrowUpCircle, downgraded: ArrowDownCircle, suspended: Ban,
    reactivated: RotateCw, canceled: XCircle, trial_started: Clock,
    package_changed: Package, subscription_created: Package,
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/platform/tenants" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-3">
          <ChevronLeft className="h-4 w-4" />Kembali ke Tenant
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{tenant?.pharmacyName ?? "Memuat..."}</h1>
        <p className="mt-1 text-sm text-neutral-500">ID: {tenant?.pharmacyId ?? ""}</p>
      </div>

      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Tenant info + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Card */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Informasi Tenant</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><p className="text-xs text-neutral-500">Status</p>
                <span className={`inline-flex items-center gap-1 mt-1 text-sm font-medium ${tenant?.isActive ? "text-green-600" : "text-red-600"}`}>
                  <span className={`h-2 w-2 rounded-full ${tenant?.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  {tenant?.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div><p className="text-xs text-neutral-500">Dibuat</p><p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{formatDate(tenant?.createdAt)}</p></div>
              <div><p className="text-xs text-neutral-500">Owner</p><p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{tenant?.ownerName ?? "—"}</p></div>
              <div><p className="text-xs text-neutral-500">User</p><p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{tenant?.userCount ?? 0} / {currentPkg?.max_users ?? "?"}</p></div>
            </div>
          </div>

          {/* Subscription Timeline */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Riwayat Langganan</h2>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">Belum ada riwayat.</p>
            ) : (
              <div className="relative space-y-0 pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
                {events.map((evt) => {
                  const Icon = eventIcons[evt.event_type] ?? Clock;
                  return (
                    <div key={evt.id} className="relative pb-4">
                      <div className="absolute -left-[19px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <Icon className="h-3 w-3 text-neutral-500" />
                      </div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{evt.event_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-neutral-400">{formatDate(evt.created_at)}</p>
                      {evt.metadata && <p className="text-xs text-neutral-500 mt-0.5">{JSON.stringify(evt.metadata)}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Package + Actions */}
        <div className="space-y-6">
          {/* Current Package */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center gap-3 mb-4">
              <Package className="h-5 w-5 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Paket Saat Ini</h2>
            </div>
            {currentPkg ? (
              <>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{currentPkg.label}</p>
                <p className="text-sm text-neutral-500">{formatRupiah(currentPkg.monthly_price)} / bulan</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {enabledFeatures.map((key) => (
                    <span key={key} className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                      {(FEATURE_LABELS as Record<string, string>)[key] ?? key}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-400">Tidak ada paket</p>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 space-y-3">
            <button onClick={() => setShowChangeModal(true)} disabled={actioning === "change"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
              <ArrowUpCircle className="h-4 w-4" />Ubah Paket
            </button>
            <button onClick={handleSuspend} disabled={!!actioning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400 transition-colors">
              <Ban className="h-4 w-4" />Suspend Langganan
            </button>
            <button onClick={handleReactivate} disabled={!!actioning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-900 dark:bg-green-950 dark:text-green-400 transition-colors">
              <RotateCw className="h-4 w-4" />Aktifkan Kembali
            </button>
            <button onClick={handleCancel} disabled={!!actioning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-400 transition-colors">
              <XCircle className="h-4 w-4" />Batalkan Langganan
            </button>
          </div>
        </div>
      </div>

      {/* Package Change Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowChangeModal(false)} />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Ubah Paket Tenant</h3>
            <p className="text-sm text-neutral-500 mb-4">Pilih paket baru untuk {tenant?.pharmacyName}</p>

            {packages.filter((p) => p.is_active).map((pkg) => {
              const isCurrent = pkg.name === tenant?.packageName;
              const isDowngrade = currentPkg && (pkg.max_users < (currentPkg.max_users ?? Infinity) || pkg.max_branches < (currentPkg.max_branches ?? Infinity));
              const pkgFeatures = Object.entries(pkg.feature_flags ?? {}).filter(([, v]) => v).map(([k]) => k);

              return (
                <div key={pkg.id}
                  className={`mb-3 rounded-lg border-2 p-4 transition-colors ${
                    isCurrent ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-neutral-200 hover:border-brand-300 dark:border-neutral-800"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-50">{pkg.label}</p>
                      <p className="text-sm text-neutral-500">{formatRupiah(pkg.monthly_price)}/bulan</p>
                    </div>
                    {isCurrent ? (
                      <span className="text-xs font-medium text-brand-600 bg-brand-100 rounded-full px-2 py-0.5 dark:bg-brand-900 dark:text-brand-400">Saat Ini</span>
                    ) : (
                      <button onClick={() => handleChange(pkg.id)} disabled={!!actioning}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isDowngrade
                            ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
                            : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400"
                        }`}>
                        {isDowngrade ? "Downgrade" : "Upgrade"}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pkgFeatures.map((key) => (
                      <span key={key} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {(FEATURE_LABELS as Record<string, string>)[key] ?? key}
                      </span>
                    ))}
                  </div>
                  {isDowngrade && !isCurrent && (
                    <p className="mt-2 text-xs text-red-600">⚠ Beberapa fitur akan dinonaktifkan.</p>
                  )}
                </div>
              );
            })}

            <button onClick={() => setShowChangeModal(false)}
              className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
