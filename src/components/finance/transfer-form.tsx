"use client";

import { useState } from "react";
import type { FinancialWallet } from "@/types";
import { ArrowRight } from "lucide-react";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface TransferFormProps {
  wallets: FinancialWallet[];
  preselectedFromId?: string;
  onSubmit: (fromId: string, toId: string, amount: number, options?: { fee?: number; notes?: string }) => Promise<void>;
  isLoading?: boolean;
}

export function TransferForm({ wallets, preselectedFromId, onSubmit, isLoading }: TransferFormProps) {
  const activeWallets = wallets.filter((w) => !w.isArchived && w.isActive);

  const [fromId, setFromId] = useState(preselectedFromId ?? "");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const fromWallet = activeWallets.find((w) => w.id === fromId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fromId) { setError("Pilih wallet sumber."); return; }
    if (!toId) { setError("Pilih wallet tujuan."); return; }
    if (fromId === toId) { setError("Wallet sumber dan tujuan tidak boleh sama."); return; }

    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) { setError("Jumlah transfer harus lebih dari Rp 0."); return; }

    const numFee = Number(fee) || 0;
    const totalDeduct = numAmount + numFee;

    // Check balance
    if (fromWallet && fromWallet.balance < totalDeduct && !fromWallet.allowOverdraft) {
      setError(
        `Saldo tidak mencukupi. Saldo ${fromWallet.name}: ${formatRupiah(fromWallet.balance)}. Dibutuhkan: ${formatRupiah(totalDeduct)}`,
      );
      return;
    }

    // Minimum balance warning (non-blocking)
    const minBal = ((fromWallet?.settings as any)?.minimum_balance as number) ?? 0;
    if (fromWallet && minBal > 0 && (fromWallet.balance - totalDeduct) < minBal) {
      const proceed = window.confirm(
        `⚠️ Peringatan: Saldo ${fromWallet.name} setelah transfer akan berada di bawah batas minimum ${formatRupiah(minBal)}.\n\n` +
        `Saldo saat ini: ${formatRupiah(fromWallet.balance)}\n` +
        `Setelah transfer: ${formatRupiah(fromWallet.balance - totalDeduct)}\n\n` +
        `Tetap lanjutkan transfer?`,
      );
      if (!proceed) return;
    }

    await onSubmit(fromId, toId, numAmount, { fee: numFee, notes: notes || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr,auto,1fr]">
        {/* From Wallet */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Dari Wallet
          </label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            required
          >
            <option value="">Pilih wallet sumber</option>
            {activeWallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatRupiah(w.balance)})
              </option>
            ))}
          </select>
        </div>

        {/* Arrow */}
        <div className="flex items-end justify-center pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* To Wallet */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Ke Wallet
          </label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            required
          >
            <option value="">Pilih wallet tujuan</option>
            {activeWallets
              .filter((w) => w.id !== fromId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatRupiah(w.balance)})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Jumlah Transfer
        </label>
        <div className="mt-1 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-500">
            Rp
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min={0}
            className="block w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            required
          />
        </div>
        {fromWallet && amount && Number(amount) > 0 && (
          <p className="mt-1 text-xs text-neutral-400">
            Saldo {fromWallet.name} setelah transfer:{" "}
            {formatRupiah(fromWallet.balance - Number(amount) - Number(fee || 0))}
          </p>
        )}
      </div>

      {/* Fee */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Biaya Admin (opsional)
        </label>
        <div className="mt-1 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-500">
            Rp
          </span>
          <input
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
            min={0}
            className="block w-full max-w-[200px] rounded-lg border border-neutral-300 bg-white pl-10 pr-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Catatan (opsional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: Transfer bulanan ke kas operasional"
          className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Memproses Transfer..." : "Transfer Sekarang"}
      </button>
    </form>
  );
}
