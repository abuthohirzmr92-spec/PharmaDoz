"use client";

import { cn } from "@/lib/cn";
import { Clock, AlertTriangle, CheckCircle, Pause } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TransactionStatusType =
  | "draft"
  | "waiting_payment"
  | "paid"
  | "on_hold";

interface TransactionStatusProps {
  status: TransactionStatusType;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Config                                                            */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  TransactionStatusType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  draft: {
    label: "Draft",
    icon: Clock,
    color: "text-warning",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  waiting_payment: {
    label: "Menunggu Pembayaran",
    icon: AlertTriangle,
    color: "text-info",
    bg: "bg-sky-50 dark:bg-sky-950/30",
  },
  paid: {
    label: "Lunas",
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  on_hold: {
    label: "Tertahan",
    icon: Pause,
    color: "text-neutral-500",
    bg: "bg-neutral-100 dark:bg-neutral-800",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function TransactionStatus({ status, className }: TransactionStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.bg,
        config.color,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
