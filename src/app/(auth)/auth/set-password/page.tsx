"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle2, Shield, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";

/**
 * Set Password Page
 *
 * Handles two entry points:
 *   1. Via auth callback → user arrives with cookies (getSession)
 *   2. Via direct hash fragment #access_token=... (Supabase implicit flow)
 *
 * Flow: check hash → set session → show form → updateUser(password) → /login
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const branding = usePlatformBrandingStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    branding.loadSettings();
    initSession();
  }, []);

  async function initSession() {
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        setError("Konfigurasi aplikasi tidak lengkap.");
        setIsLoading(false);
        return;
      }

      const supabase = createBrowserClient(url, key);

      // 1. Check hash fragment — Supabase implicit flow (#access_token=...)
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!sessionErr) {
            // Clean URL — remove hash
            window.history.replaceState(null, "", window.location.pathname);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Check cookie-based session (from auth callback)
      const { data, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr || !data.session) {
        setError("Session tidak ditemukan. Silakan buka link aktivasi atau reset password dari email Anda.");
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
    } catch {
      setError("Gagal memeriksa session. Silakan coba lagi.");
    }
    setIsLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Password tidak cocok.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Konfigurasi tidak lengkap.");

      const supabase = createBrowserClient(url, key);
      const { error: updateErr } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (updateErr) throw updateErr;

      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-neutral-500">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  // --- Not authenticated — show guidance ---
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950/30">
            <Shield className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              Diperlukan Verifikasi
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {error || "Silakan buka link aktivasi atau reset password dari email yang dikirim ke Anda."}
            </p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition"
            >
              Kembali ke Login
            </button>
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              Kirim Ulang Reset Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Done ---
  if (isDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/30">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-3 text-lg font-semibold text-green-700 dark:text-green-300">
              Password Berhasil Disimpan!
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Silakan login dengan password baru Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            Lanjut ke Login
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- Set Password Form ---
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Atur Password Baru
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Buat password untuk akun Anda di {branding.getAppName()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Password Baru
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Minimal 6 karakter"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Konfirmasi Password
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Ulangi password"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              isSubmitting
                ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                : "bg-brand-600 text-white hover:bg-brand-700",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
