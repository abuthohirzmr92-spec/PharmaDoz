"use client";

import { useState } from "react";
import type { WalletType } from "@/types";

export interface WalletFormData {
  name: string;
  type: WalletType;
  branchId: string;
  currency: string;
  allowOverdraft: boolean;
  overdraftLimit: number;
  category: string;
  minimumBalance: number;
}

interface WalletFormProps {
  initialData?: Partial<WalletFormData>;
  onSubmit: (data: WalletFormData) => Promise<void>;
  isLoading?: boolean;
  branches?: { id: string; name: string }[];
}

const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: "cash", label: "Kas / Tunai" },
  { value: "bank", label: "Rekening Bank" },
  { value: "digital", label: "Dompet Digital / E-Wallet" },
];

export function WalletForm({ initialData, onSubmit, isLoading, branches }: WalletFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<WalletType>(initialData?.type ?? "cash");
  const [branchId, setBranchId] = useState(initialData?.branchId ?? "");
  const [currency, setCurrency] = useState(initialData?.currency ?? "IDR");
  const [allowOverdraft, setAllowOverdraft] = useState(initialData?.allowOverdraft ?? false);
  const [overdraftLimit, setOverdraftLimit] = useState(initialData?.overdraftLimit ?? 0);
  const [category, setCategory] = useState(initialData?.category ?? "operasional");
  const [minimumBalance, setMinimumBalance] = useState(initialData?.minimumBalance ?? 0);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama wallet wajib diisi.");
      return;
    }

    await onSubmit({
      name: name.trim(),
      type,
      branchId: branchId || "",
      currency,
      allowOverdraft,
      overdraftLimit: allowOverdraft ? overdraftLimit : 0,
      category,
      minimumBalance,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Nama Wallet
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Kas Utama, BCA Operasional"
          className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          required
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Tipe Wallet
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as WalletType)}
          className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          {WALLET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Branch (optional) */}
      {branches && branches.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Cabang (opsional)
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            <option value="">Semua Cabang (Tenant Level)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Kosongkan untuk wallet level tenant (bisa diakses semua cabang).
          </p>
        </div>
      )}

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Mata Uang
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <option value="IDR">IDR — Rupiah</option>
          <option value="USD">USD — US Dollar</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Kategori Dana
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <option value="operasional">Operasional — Kas harian & pembayaran rutin</option>
          <option value="cadangan">Cadangan — Dana darurat & tabungan</option>
          <option value="pengembangan">Pengembangan — Investasi & ekspansi</option>
          <option value="pemilik">Pemilik — Dana pribadi owner</option>
        </select>
      </div>

      {/* Minimum Balance */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Saldo Minimum (Rp)
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={minimumBalance > 0 ? minimumBalance.toLocaleString("id-ID") : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setMinimumBalance(raw ? parseInt(raw) : 0);
          }}
          placeholder="0"
          className="mt-1 block w-full max-w-[200px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Peringatan muncul jika transfer menyebabkan saldo di bawah batas ini.
        </p>
      </div>

      {/* Overdraft */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allowOverdraft}
            onChange={(e) => setAllowOverdraft(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Izinkan Overdraft
          </span>
        </label>
        <p className="mt-1 ml-7 text-xs text-neutral-500">
          Mengizinkan saldo negatif hingga batas tertentu. Tidak disarankan untuk wallet kas.
        </p>

        {allowOverdraft && (
          <div className="mt-3 ml-7">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Batas Overdraft (Rp)
            </label>
            <input
              type="number"
              value={overdraftLimit}
              onChange={(e) => setOverdraftLimit(Math.max(0, Number(e.target.value)))}
              min={0}
              className="mt-1 block w-full max-w-[200px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Menyimpan..." : "Simpan Wallet"}
      </button>
    </form>
  );
}
