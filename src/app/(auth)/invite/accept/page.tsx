"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, Loader2, CheckCircle2, Shield, ArrowRight } from "lucide-react";
import { validateInvitationToken } from "@/lib/invitation/validate-token";
import { acceptInvitation } from "@/lib/invitation/invite";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { TenantRole } from "@/types";

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<"loading" | "valid" | "invalid" | "submitting" | "done">("loading");
  const [validError, setValidError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    role: string;
    tenantName?: string;
  } | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setValidError("Token tidak ditemukan di URL.");
      return;
    }

    validateInvitationToken(token)
      .then((res) => {
        if (res.valid && res.invite) {
          setInviteInfo(res.invite);
          setState("valid");
        } else {
          setState("invalid");
          setValidError(res.error ?? "Token tidak valid.");
        }
      })
      .catch((err) => {
        console.error("validateInvitationToken failed:", err);
        setState("invalid");
        setValidError("Gagal memeriksa undangan. Coba lagi nanti.");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Password tidak cocok.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setState("submitting");
    setError(null);

    const res = await acceptInvitation({
      token,
      password: form.password,
      displayName: form.displayName,
    });

    if (res.success) {
      setState("done");
    } else {
      setError(res.error ?? "Gagal menerima undangan.");
      setState("valid");
    }
  };

  // --- Loading ---
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm text-neutral-500">Memeriksa undangan...</p>
      </div>
    );
  }

  // --- Invalid token ---
  if (state === "invalid") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            Undangan Tidak Valid
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {validError}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          Kembali ke Login
        </button>
      </div>
    );
  }

  // --- Done ---
  if (state === "done") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-300">
            Undangan Diterima!
          </p>
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Akun Anda telah dibuat dan terhubung ke tenant. Silakan login.
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
    );
  }

  // --- Form ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info undangan */}
      {inviteInfo && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
              {inviteInfo.email}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-400" />
            <span className="text-xs text-brand-600 dark:text-brand-400">
              {ROLE_LABELS[inviteInfo.role as TenantRole] ?? inviteInfo.role}
            </span>
          </div>
          {inviteInfo.tenantName && (
            <p className="mt-1 text-xs text-neutral-400">
              Bergabung ke: {inviteInfo.tenantName}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Nama Lengkap
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            placeholder="Nama Anda"
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            required
            minLength={2}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Minimal 6 karakter"
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            required
            minLength={6}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Konfirmasi Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            placeholder="Ulangi password"
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            required
            minLength={6}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={state === "submitting"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
      >
        {state === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Memproses...
          </>
        ) : (
          "Terima Undangan"
        )}
      </button>
    </form>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Terima Undangan
          </h1>
          <p className="text-xs text-neutral-500">
            Lengkapi data Anda untuk bergabung ke tenant
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="text-sm text-neutral-500">Memeriksa undangan...</p>
            </div>
          }
        >
          <AcceptInvitationForm />
        </Suspense>
      </div>
    </div>
  );
}
