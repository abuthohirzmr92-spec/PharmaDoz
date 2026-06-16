"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  User,
  Package,
  Globe,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { provisionTenant } from "@/lib/tenant/provisioning";
import { generateSlug } from "@/lib/tenant/onboarding";
import type { ProvisioningInput, ProvisioningError, ProvisioningWarning } from "@/types";
import { cn } from "@/lib/cn";
import { usePackageStore } from "@/store/package-store";

type FormState = "idle" | "submitting" | "success" | "success_with_warning" | "failure";

function formatPrice(price: number): string {
  if (price === 0) return "Gratis";
  return `Rp ${price.toLocaleString("id-ID")}/bln`;
}

function buildPackageLabel(pkg: { name: string; label: string; maxUsers: number; maxBranches: number; maxProducts: number; monthlyPrice: number }): string {
  return `${pkg.label} — ${pkg.maxUsers} user, ${pkg.maxBranches} cabang, ${pkg.maxProducts.toLocaleString("id-ID")} produk (${formatPrice(pkg.monthlyPrice)})`;
}

export default function CreateTenantPage() {
  const router = useRouter();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { packages: dbPackages, loadPackages } = usePackageStore();

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  // Build dropdown options from database packages
  const packageOptions = useMemo(() => {
    if (dbPackages.length === 0) return [];
    return dbPackages
      .filter((p) => p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        value: p.name,
        label: buildPackageLabel(p),
      }));
  }, [dbPackages]);

  const [form, setForm] = useState({
    ownerEmail: "",
    ownerDisplayName: "",
    tenantName: "",
    packageSlug: "basic",
    domain: "",
  });
  const [slug, setSlug] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<ProvisioningError[]>([]);
  const [warnings, setWarnings] = useState<ProvisioningWarning[]>([]);
  const [result, setResult] = useState<{
    tenantId?: string;
    ownerEmail?: string;
  } | null>(null);

  // Bersihkan timer redirect saat unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // Auto-redirect ke daftar tenant setelah sukses
  useEffect(() => {
    if (state === "success" || state === "success_with_warning") {
      redirectTimerRef.current = setTimeout(() => {
        router.push("/platform/tenants");
      }, state === "success" ? 2500 : 5000);
    }
  }, [state, router]);

  const updateField = useCallback(
    (field: string, value: string) => {
      const next = { ...form, [field]: value };
      setForm(next);
      if (field === "tenantName") {
        setSlug(generateSlug(value));
      }
      if (state === "failure") {
        setState("idle");
        setErrors([]);
      }
    },
    [form, state],
  );

  const fieldError = (field: string) => errors.find((e) => e.field === field);

  const resetForm = () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    setState("idle");
    setResult(null);
    setErrors([]);
    setWarnings([]);
    setForm({ ownerEmail: "", ownerDisplayName: "", tenantName: "", packageSlug: "basic", domain: "" });
    setSlug("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Cegah duplicate submission
    if (state === "submitting") return;

    setState("submitting");
    setErrors([]);
    setWarnings([]);

    const input: ProvisioningInput = {
      ownerEmail: form.ownerEmail,
      ownerDisplayName: form.ownerDisplayName,
      tenantName: form.tenantName,
      slug: slug || undefined,
      domain: form.domain || null,
      packageSlug: form.packageSlug,
    };

    const res = await provisionTenant(input);

    // --- FAILURE ---
    if (res.status === "failure") {
      setErrors(res.errors ?? []);
      setState("failure");
      return;
    }

    // --- SUCCESS / SUCCESS_WITH_WARNING ---
    setResult({
      tenantId: res.tenantId,
      ownerEmail: res.ownerEmail,
    });

    if (res.status === "success_with_warning") {
      setWarnings(res.warnings ?? []);
      setState("success_with_warning");
      toast.warning("Tenant berhasil dibuat dengan beberapa catatan.");
    } else {
      setState("success");
      toast.success("Tenant berhasil diprovisikan!");
    }
  };

  // ------------------------------------------------------------------
  // SUCCESS STATE
  // ------------------------------------------------------------------
  if (state === "success" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-4 text-center">
        <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
        <h2 className="text-xl font-bold">Tenant Berhasil Diprovisikan</h2>
        <p className="text-sm text-muted-foreground">
          {form.tenantName} ({result.ownerEmail}) telah dibuat.
        </p>
        <p className="text-xs text-muted-foreground">
          Mengarahkan ke daftar tenant...
        </p>
        <button
          type="button"
          onClick={() => router.push("/platform/tenants")}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Lihat Daftar Tenant
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // SUCCESS WITH WARNING STATE
  // ------------------------------------------------------------------
  if (state === "success_with_warning" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-2">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Tenant Berhasil Dibuat dengan Catatan
            </p>
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
                {w.message}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tenant</span>
            <span className="font-medium">{form.tenantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email Pemilik</span>
            <span className="font-mono">{result.ownerEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tenant ID</span>
            <span className="font-mono text-xs">{result.tenantId}</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Mengarahkan ke daftar tenant dalam 5 detik...
        </p>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/platform/tenants")}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Lihat Daftar Tenant
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            Provisioning Baru
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // FORM (idle / submitting / failure)
  // ------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/platform/tenants")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provisioning Tenant Baru</h1>
          <p className="text-sm text-muted-foreground">
            Buat apotek baru dengan akun pemilik, cabang default, dan langganan trial.
          </p>
        </div>
      </div>

      {/* Failure summary */}
      {state === "failure" && errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Provisioning Gagal
              </p>
              {errors.map((e, i) => (
                <p key={i} className="text-sm text-red-700 dark:text-red-300">
                  {e.message}
                  {e.suggestion && (
                    <span className="ml-2 text-xs text-red-500">
                      Saran: {e.suggestion}
                    </span>
                  )}
                </p>
              ))}
              {errors.some((e) => e.retryable) && (
                <button
                  type="button"
                  onClick={() => {
                    setState("idle");
                    setErrors([]);
                  }}
                  className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-300"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --- Owner Info --- */}
        <fieldset disabled={state === "submitting"} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email Pemilik</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) => updateField("ownerEmail", e.target.value)}
                placeholder="pemilik@apotek.com"
                className={cn(
                  "w-full rounded-lg border py-2 pl-10 pr-3 text-sm",
                  fieldError("ownerEmail") ? "border-red-300 bg-red-50" : "bg-background",
                )}
                required
              />
            </div>
            {fieldError("ownerEmail") && (
              <p className="mt-1 text-xs text-red-500">{fieldError("ownerEmail")!.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nama Pemilik</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={form.ownerDisplayName}
                onChange={(e) => updateField("ownerDisplayName", e.target.value)}
                placeholder="Nama lengkap pemilik apotek"
                className={cn(
                  "w-full rounded-lg border py-2 pl-10 pr-3 text-sm bg-background",
                  fieldError("ownerDisplayName") && "border-red-300 bg-red-50",
                )}
                required
              />
            </div>
            {fieldError("ownerDisplayName") && (
              <p className="mt-1 text-xs text-red-500">{fieldError("ownerDisplayName")!.message}</p>
            )}
          </div>
        </fieldset>

        {/* --- Tenant Info --- */}
        <fieldset disabled={state === "submitting"} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nama Apotek</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={form.tenantName}
                onChange={(e) => updateField("tenantName", e.target.value)}
                placeholder="Nama apotek (min. 2 karakter)"
                className={cn(
                  "w-full rounded-lg border py-2 pl-10 pr-3 text-sm bg-background",
                  fieldError("tenantName") && "border-red-300 bg-red-50",
                )}
                required
              />
            </div>
            {fieldError("tenantName") && (
              <p className="mt-1 text-xs text-red-500">{fieldError("tenantName")!.message}</p>
            )}
            {slug && (
              <p className="mt-1 text-xs text-muted-foreground">
                Slug: <code className="font-mono">{slug}</code>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Paket Langganan</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={form.packageSlug}
                onChange={(e) => updateField("packageSlug", e.target.value)}
                className="w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm"
              >
                {packageOptions.length === 0 ? (
                  <option value="">Memuat paket...</option>
                ) : (
                  packageOptions.map((pkg) => (
                    <option key={pkg.value} value={pkg.value}>
                      {pkg.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Domain <span className="text-muted-foreground">(opsional)</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={form.domain}
                onChange={(e) => updateField("domain", e.target.value)}
                placeholder="apotek-sehat.medisync.id"
                className="w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm"
              />
            </div>
            {fieldError("domain") && (
              <p className="mt-1 text-xs text-red-500">{fieldError("domain")!.message}</p>
            )}
          </div>
        </fieldset>

        {/* --- Submit --- */}
        <button
          type="submit"
          disabled={state === "submitting"}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition",
            state === "submitting"
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {state === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memprovisikan Tenant...
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4" />
              Provisioning Tenant
            </>
          )}
        </button>

        {state === "submitting" && (
          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <p className="animate-pulse">Membuat akun pemilik...</p>
            <p className="animate-pulse">Memprovisikan tenant, cabang, dan langganan...</p>
          </div>
        )}
      </form>
    </div>
  );
}
