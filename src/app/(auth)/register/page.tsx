"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pill,
  User,
  Store,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { registerTenant } from "@/lib/tenant/onboarding";
import { isSupabaseConnected } from "@/lib/supabase/client";

type Step = 1 | 2 | 3;

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  pharmacyName: string;
  location: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    pharmacyName: "",
    location: "",
  });

  const hasSupabase = isSupabaseConnected();

  if (!hasSupabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
        <div className="w-full max-w-lg text-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
              <Pill className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              Apotek Manage
            </h1>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Pendaftaran tidak tersedia
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Layanan sedang tidak tersedia. Silakan coba lagi nanti.
            </p>
          </div>
          <p className="mt-6 text-center text-[10px] text-neutral-400">
            Aplikasi Manajemen Apotek — Role-Based Access Control
          </p>
        </div>
      </div>
    );
  }

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep1(): boolean {
    if (!form.email.trim()) { setError("Email wajib diisi."); return false; }
    if (!form.password) { setError("Password wajib diisi."); return false; }
    if (form.password.length < 8) { setError("Password minimal 8 karakter."); return false; }
    if (form.password !== form.confirmPassword) { setError("Password tidak cocok."); return false; }
    if (!form.displayName.trim()) { setError("Nama wajib diisi."); return false; }
    return true;
  }

  function validateStep2(): boolean {
    if (!form.pharmacyName.trim()) { setError("Nama apotek wajib diisi."); return false; }
    if (form.pharmacyName.trim().length < 2) { setError("Nama apotek terlalu pendek."); return false; }
    return true;
  }

  function handleNext() {
    setError("");
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) handleSubmit();
  }

  function handleBack() {
    setError("");
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError("");

    const result = await registerTenant({
      email: form.email.trim(),
      password: form.password,
      displayName: form.displayName.trim(),
      pharmacyName: form.pharmacyName.trim(),
      pharmacySlug: "",
      location: form.location.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Gagal mendaftar.");
      return;
    }

    setStep(3);
  }

  const steps = [
    { num: 1, label: "Akun" },
    { num: 2, label: "Apotek" },
    { num: 3, label: "Selesai" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="w-full max-w-lg">
        {/* Branding */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <Pill className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              Apotek Manage
            </h1>
            <p className="text-sm text-neutral-500">
              Daftar apotek baru — gratis 14 hari
            </p>
          </div>
        </div>

        {/* Step indicator */}
        {step !== 3 && (
          <div className="mb-4 flex items-center justify-center gap-2">
            {steps.filter(s => s.num <= 2).map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                    step > s.num
                      ? "bg-brand-600 text-white"
                      : step === s.num
                        ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
                        : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800",
                  )}
                >
                  {step > s.num ? <CheckCircle className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span className="text-[10px] font-medium text-neutral-400">
                  {s.label}
                </span>
                {i < 1 && (
                  <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-700" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Account creation */}
        {step === 1 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Buat Akun
              </span>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-neutral-500">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => update("displayName", e.target.value)}
                  placeholder="Nama pemilik apotek"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-neutral-500">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-neutral-500">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-neutral-500">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pharmacy info */}
        {step === 2 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-4 flex items-center gap-2">
              <Store className="h-4 w-4 text-neutral-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Informasi Apotek
              </span>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-neutral-500">
                  Nama Apotek
                </label>
                <input
                  type="text"
                  value={form.pharmacyName}
                  onChange={(e) => update("pharmacyName", e.target.value)}
                  placeholder="Nama apotek Anda"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-neutral-500">
                  Alamat / Lokasi <span className="text-neutral-300">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Alamat apotek"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
              <p className="text-[10px] text-blue-700 dark:text-blue-300">
                Akun Anda akan mendapatkan <strong>paket Basic gratis</strong> selama 14 hari.
                Upgrade ke Professional atau Enterprise tersedia setelah pendaftaran.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="rounded-xl border border-green-200 bg-white p-8 text-center dark:border-green-800 dark:bg-neutral-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              Pendaftaran Berhasil!
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Apotek <strong>{form.pharmacyName}</strong> telah terdaftar.
              {form.location && (
                <span> Berlokasi di {form.location}.</span>
              )}
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Cek email <strong>{form.email}</strong> untuk verifikasi akun.
                Setelah verifikasi, Anda dapat masuk sebagai pemilik apotek.
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Ke Halaman Masuk
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {step !== 3 && (
          <div className="mt-4 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                <>
                  {step === 2 ? "Daftar" : "Lanjut"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Login link */}
        <p className="mt-4 text-center text-[11px] text-neutral-400">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Masuk di sini
          </Link>
        </p>

        <p className="mt-4 text-center text-[10px] text-neutral-400">
          Aplikasi Manajemen Apotek — Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
