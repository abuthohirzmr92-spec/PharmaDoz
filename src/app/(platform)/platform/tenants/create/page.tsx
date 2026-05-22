"use client";

import { useState, useCallback } from "react";
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
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { provisionTenant } from "@/lib/tenant/provisioning";
import { generateSlug } from "@/lib/tenant/onboarding";
import type { ProvisioningInput, ProvisioningError } from "@/types";
import { cn } from "@/lib/cn";

type FormState = "idle" | "submitting" | "success" | "error";

const PACKAGES = [
  { value: "basic", label: "Basic", desc: "3 user, 1 cabang, 200 produk", price: "Gratis" },
  { value: "professional", label: "Professional", desc: "10 user, 3 cabang, 1.000 produk", price: "Rp 299.000/bln" },
  { value: "enterprise", label: "Enterprise", desc: "50 user, 10 cabang, 10.000 produk", price: "Rp 999.000/bln" },
];

export default function CreateTenantPage() {
  const router = useRouter();

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
  const [result, setResult] = useState<{
    tenantId?: string;
    ownerEmail?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = useCallback(
    (field: string, value: string) => {
      const next = { ...form, [field]: value };
      setForm(next);
      if (field === "tenantName") {
        setSlug(generateSlug(value));
      }
      if (state === "error") {
        setState("idle");
        setErrors([]);
      }
    },
    [form, state],
  );

  const fieldError = (field: string) => errors.find((e) => e.field === field);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("submitting");
    setErrors([]);

    const input: ProvisioningInput = {
      ownerEmail: form.ownerEmail,
      ownerDisplayName: form.ownerDisplayName,
      tenantName: form.tenantName,
      slug: slug || undefined,
      domain: form.domain || null,
      packageSlug: form.packageSlug,
    };

    const res = await provisionTenant(input);

    if (!res.success) {
      setErrors(res.errors ?? []);
      setState("error");

      const fatal = res.errors?.some((e) => !e.retryable);
      if (fatal) {
        toast.error("Provisioning gagal. Periksa kembali input.");
      }
      return;
    }

    setResult({
      tenantId: res.tenantId,
      ownerEmail: res.ownerEmail,
    });
    setState("success");
    toast.success("Tenant berhasil diprovisikan!");
  };

  // ------------------------------------------------------------------
  // SUCCESS STATE
  // ------------------------------------------------------------------
  if (state === "success" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 py-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
            Tenant Berhasil Diprovisikan
          </h2>
          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            Akun pemilik telah dibuat dan email konfirmasi telah dikirim.
          </p>

          <div className="mt-6 rounded-lg bg-white p-4 text-left dark:bg-neutral-900 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email Pemilik</span>
              <span className="font-mono font-medium">{result.ownerEmail}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tenant ID</span>
              <span className="font-mono text-xs">{result.tenantId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nama Apotek</span>
              <span className="font-medium">{form.tenantName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono">{slug}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paket</span>
              <span className="font-medium capitalize">{form.packageSlug}</span>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-left dark:bg-amber-950">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Langkah Selanjutnya
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700 dark:text-amber-300">
              <li>Pemilik akan menerima email konfirmasi dari Supabase</li>
              <li>Pemilik harus mengkonfirmasi email sebelum login</li>
              <li>Setelah login, pemilik dapat menyelesaikan onboarding</li>
            </ul>
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push("/platform/tenants")}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar Tenant
            </button>
            <button
              type="button"
              onClick={() => {
                setState("idle");
                setResult(null);
                setForm({ ownerEmail: "", ownerDisplayName: "", tenantName: "", packageSlug: "basic", domain: "" });
                setSlug("");
                setErrors([]);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Provisioning Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // FORM (idle / submitting / error)
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

      {/* Error summary */}
      {state === "error" && errors.length > 0 && (
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
                  onClick={handleSubmit}
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
                  fieldError("ownerEmail")
                    ? "border-red-300 bg-red-50"
                    : "bg-background",
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
                {PACKAGES.map((pkg) => (
                  <option key={pkg.value} value={pkg.value}>
                    {pkg.label} — {pkg.desc} ({pkg.price})
                  </option>
                ))}
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
            <p className="animate-pulse" style={{ animationDelay: "500ms" }}>
              Memprovisikan tenant, cabang, dan langganan...
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
