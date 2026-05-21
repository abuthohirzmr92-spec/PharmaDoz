"use client";

import { cn } from "@/lib/cn";
import type { Payment } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface PaymentHistoryTableProps {
  payments: Payment[];
}

/* ------------------------------------------------------------------ */
/*  Status badge helpers                                                */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: {
  [key: string]: { bg: string; text: string; label: string };
  success: { bg: string; text: string; label: string };
  pending: { bg: string; text: string; label: string };
  failed: { bg: string; text: string; label: string };
  refunded: { bg: string; text: string; label: string };
} = {
  success: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
    label: "Berhasil",
  },
  pending: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    label: "Menunggu",
  },
  failed: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    label: "Gagal",
  },
  refunded: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-600 dark:text-neutral-400",
    label: "Dikembalikan",
  },
};

function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  const found = STATUS_BADGE[status];
  if (found) return found;
  return STATUS_BADGE.pending;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  transfer_bank: "Transfer Bank",
  kartu_kredit: "Kartu Kredit",
  kartu_debit: "Kartu Debit",
  dompet_digital: "Dompet Digital",
  va: "Virtual Account",
  retail: "Gerai Retail",
};

function getMethodLabel(method: string | null | undefined): string {
  if (!method) return "-";
  return PAYMENT_METHOD_LABEL[method] ?? method;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Belum ada pembayaran
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {/* Header */}
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                Tanggal
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                Jumlah
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                Status
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                Metode
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {payments.map((payment) => {
              const badge = getStatusBadge(payment.status);

              return (
                <tr
                  key={payment.id}
                  className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {formatDate(payment.paidAt ?? payment.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        badge.bg,
                        badge.text,
                      )}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {getMethodLabel(payment.paymentMethod)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
