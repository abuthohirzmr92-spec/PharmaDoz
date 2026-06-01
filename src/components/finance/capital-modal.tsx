"use client";

import { useState } from "react";
import type { FinancialWallet } from "@/types";
import { X } from "lucide-react";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

interface CapitalModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { type: "deposit" | "withdrawal"; amount: number; walletId: string; description: string }) => Promise<void>;
  wallets: FinancialWallet[];
  capitalBalance: number;
  isLoading?: boolean;
}

export function CapitalModal({ open, onClose, onSubmit, wallets, capitalBalance, isLoading }: CapitalModalProps) {
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const activeWallets = wallets.filter((w) => !w.isArchived && w.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) { setError("Jumlah harus lebih dari Rp 0."); return; }
    if (!walletId) { setError("Pilih wallet tujuan."); return; }
    if (txType === "withdrawal" && numAmount > capitalBalance) {
      setError(`Modal tidak mencukupi. Saldo modal: ${formatRupiah(capitalBalance)}`);
      return;
    }

    await onSubmit({ type: txType, amount: numAmount, walletId, description });
    // Reset form on success
    setAmount("");
    setDescription("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {txType === "deposit" ? "Setor Modal" : "Tarik Modal"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
            {(["deposit", "withdrawal"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setTxType(t); setError(""); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  txType === t ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50" : "text-neutral-500 hover:text-neutral-700"
                }`}>
                {t === "deposit" ? "Setor Modal" : "Tarik Modal"}
              </button>
            ))}
          </div>

          {/* Wallet select */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Wallet</label>
            <select value={walletId} onChange={(e) => setWalletId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" required>
              <option value="">Pilih wallet</option>
              {activeWallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Jumlah</label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-500">Rp</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0" min={0} className="block w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" required />
            </div>
            <p className="mt-1 text-xs text-neutral-400">Modal saat ini: {formatRupiah(capitalBalance)}</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Keterangan (opsional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={txType === "deposit" ? "Contoh: Modal awal usaha" : "Contoh: Penarikan dividen"}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
          </div>

          <button type="submit" disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {isLoading ? "Memproses..." : txType === "deposit" ? "Setor Modal" : "Tarik Modal"}
          </button>
        </form>
      </div>
    </div>
  );
}
