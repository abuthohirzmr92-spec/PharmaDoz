"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { schedulerRunRepo } from "@/lib/repository-instances";
import { AppBadge } from "@/components/ui/app-badge";
import type { SchedulerRunRow } from "@/types/subscription-dtos";

const fmt = (iso: string | null | undefined) =>
  iso && !Number.isNaN(Date.parse(iso))
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

const statusIcon = (s: string) =>
  s === "completed" ? CheckCircle2 : s === "failed" ? XCircle : s === "running" ? Clock : AlertTriangle;

const statusTone = (s: string) =>
  s === "completed" ? "success" : s === "failed" ? "danger" : s === "running" ? "info" : "warning";

export default function SchedulerPage() {
  return (
    <div className="grid gap-4">
      <RunHistoryWidget />
      <CorrelationWidget />
    </div>
  );
}

function RunHistoryWidget() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const { data: jobKeys, loading: keysLoading } = useAsync(() => schedulerRunRepo.listJobKeys(), []);
  const { data: runs, loading } = useAsync(async () => {
    if (selectedJob) return schedulerRunRepo.listRecent(selectedJob, 20);
    // Load all jobs' recent runs (up to 5 each)
    const keys = jobKeys ?? ["subscription_sweep", "reminder_dispatch"];
    const all: (SchedulerRunRow & { _job: string })[] = [];
    for (const key of keys) {
      const recent = await schedulerRunRepo.listRecent(key, 5);
      for (const r of recent) all.push({ ...r, _job: key } as SchedulerRunRow & { _job: string });
    }
    return all;
  }, [selectedJob, jobKeys]);

  const allRuns: (SchedulerRunRow & { _job?: string })[] = (runs ?? []) as (SchedulerRunRow & { _job?: string })[];
  const keys = jobKeys ?? [];

  // Summary stats
  const totalRuns = allRuns.length;
  const completedRuns = allRuns.filter((r) => r.status === "completed").length;
  const failedRuns = allRuns.filter((r) => r.status === "failed").length;

  return (
    <WidgetShell title="Jadwal & Otomasi" loading={keysLoading || loading} error={null}>
      {/* ── Summary bar ── */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-neutral-200 p-3 text-center dark:border-neutral-800">
          <BarChart3 className="mx-auto h-4 w-4 text-brand-500" />
          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{totalRuns}</p>
          <p className="text-[11px] text-neutral-400">Total Run</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-3 text-center dark:border-neutral-800">
          <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
          <p className="text-lg font-bold text-green-700 dark:text-green-400">{completedRuns}</p>
          <p className="text-[11px] text-neutral-400">Sukses</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-3 text-center dark:border-neutral-800">
          <XCircle className="mx-auto h-4 w-4 text-red-500" />
          <p className="text-lg font-bold text-red-700 dark:text-red-400">{failedRuns}</p>
          <p className="text-[11px] text-neutral-400">Gagal</p>
        </div>
      </div>

      {/* ── Job filter tabs ── */}
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
        <button
          onClick={() => setSelectedJob(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
            selectedJob === null
              ? "border-brand-200 bg-white text-brand-700 shadow-sm dark:border-brand-800 dark:bg-neutral-800 dark:text-brand-300"
              : "border border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          Semua
        </button>
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => setSelectedJob(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              selectedJob === key
                ? "border-brand-200 bg-white text-brand-700 shadow-sm dark:border-brand-800 dark:bg-neutral-800 dark:text-brand-300"
                : "border border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {key.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* ── Run table ── */}
      {allRuns.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-400">
          {keys.length === 0 ? "Belum ada scheduler job yang tercatat. Runtime cron akan mengisi data setelah staging." : "Belum ada data run untuk filter yang dipilih."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-3 font-medium text-neutral-500">Job</th>
                <th className="py-2 px-2 font-medium text-neutral-500">Tanggal</th>
                <th className="py-2 px-2 font-medium text-neutral-500">Status</th>
                <th className="py-2 px-2 font-medium text-neutral-500 text-right">Diproses</th>
                <th className="py-2 pl-2 font-medium text-neutral-500">Selesai</th>
              </tr>
            </thead>
            <tbody>
              {allRuns.map((r) => {
                const Icon = statusIcon(r.status);
                return (
                  <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800/50">
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs font-medium text-neutral-900 dark:text-neutral-50">
                        {(r as any)._job ?? r.jobKey}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-neutral-500">{r.runDate}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1">
                        <Icon className={`h-3.5 w-3.5 ${
                          r.status === "completed" ? "text-green-500" : r.status === "failed" ? "text-red-500" : r.status === "running" ? "text-blue-500" : "text-amber-500"
                        }`} />
                        <AppBadge variant={statusTone(r.status)}>{r.status}</AppBadge>
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-xs">{r.processedCount}</td>
                    <td className="py-2 pl-2 text-xs text-neutral-400">{fmt(r.finishedAt ?? null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </WidgetShell>
  );
}

function CorrelationWidget() {
  return (
    <WidgetShell title="Korelasi & Idempotensi" loading={false} error={null}>
      <p className="mb-2 text-sm text-neutral-500">
        Setiap scheduler run tercatat dengan correlationId yang menghubungkan ke subscription_events. Guard idempotensi (UNIQUE job_key + run_date) mencegah duplikasi eksekusi.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Idempotensi Guard</p>
          <p className="mt-1 text-xs text-neutral-500">UNIQUE(job_key, run_date) — setiap job hanya bisa berjalan sekali per hari.</p>
        </div>
        <div className="rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Sweep by Lifecycle State</p>
          <p className="mt-1 text-xs text-neutral-500">Subscription sweep memproses tenant berdasarkan lifecycle_state: trial_expired → expired, grace_period → read_only, dll.</p>
        </div>
      </div>
    </WidgetShell>
  );
}
