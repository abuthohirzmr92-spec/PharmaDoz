"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Shield,
  User,
  LogIn,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { ROLE_LABELS, SYSTEM_ROLES, BUSINESS_ROLES } from "@/lib/auth/roles";
import type { AppRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const loginAs = useAuthStore((s) => s.loginAs);
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);

  /* ---- email/password form ---- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ---- demo section ---- */
  const [showDemo, setShowDemo] = useState(false);

  const hasSupabase = isSupabaseConnected();

  const handleDemoLogin = (role: AppRole) => {
    loginAs(role);
    router.push("/dashboard");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithEmail(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error ?? "Gagal masuk. Coba lagi.");
    }
  };

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
              {hasSupabase
                ? "Masuk dengan akun Anda"
                : "Demo Mode — Pilih role untuk masuk"}
            </p>
          </div>
        </div>

        {/* Email/Password Login (Supabase mode) */}
        {hasSupabase && (
          <form
            onSubmit={handleEmailLogin}
            className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="mb-4 flex items-center gap-2">
              <LogIn className="h-4 w-4 text-neutral-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Masuk
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
                <label
                  htmlFor="email"
                  className="mb-1 block text-[10px] font-medium text-neutral-500"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@apotek.id"
                  autoComplete="email"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-[10px] font-medium text-neutral-500"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isSubmitting ? "Masuk..." : "Masuk"}
              </button>
            </div>

            <p className="mt-3 text-center">
              <button
                type="button"
                onClick={() =>
                  toast.info(
                    "Hubungi Super Admin untuk reset password.",
                  )
                }
                className="text-[11px] text-neutral-400 hover:text-brand-600"
              >
                Lupa password?
              </button>
            </p>
          </form>
        )}

        {/* Demo Mode Section */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-medium transition-colors",
              showDemo
                ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/20 dark:text-brand-300"
                : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800",
            )}
          >
            <span>
              Mode Demo (Development)
              {!hasSupabase && (
                <span className="ml-1 text-[10px] text-brand-500">
                  — aktif
                </span>
              )}
            </span>
            {showDemo ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showDemo && (
            <div className="mt-3 space-y-4">
              {hasSupabase && (
                <p className="text-[10px] text-neutral-400">
                  Mode Demo tidak memerlukan koneksi Supabase. Gunakan untuk
                  development dan testing.
                </p>
              )}

              {/* System Roles */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    System Roles
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SYSTEM_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleDemoLogin(role)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-4 text-center transition-all hover:border-brand-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-brand-600",
                      )}
                    >
                      <Shield className="h-5 w-5 text-neutral-400" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {ROLE_LABELS[role]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Business Roles */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Business Roles
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {BUSINESS_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleDemoLogin(role)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-4 text-center transition-all hover:border-brand-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-brand-600",
                      )}
                    >
                      <User className="h-5 w-5 text-neutral-400" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {ROLE_LABELS[role]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-neutral-400">
          Aplikasi Manajemen Apotek — Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
