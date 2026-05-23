"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import {
  isDiagnosticsEnabled,
  diagnosticRepo,
  authHydrationProbe,
  captureStorageSnapshot,
} from "@/lib/diagnostics";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { telemetryBus } from "@/lib/observability/telemetry";
import type { TelemetryEvent } from "@/lib/observability/types";
import type { DiagnosticFinding, FindingSeverity, ProbeStep } from "@/lib/diagnostics";
import {
  Activity,
  Clock,
  Shield,
  Server,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Copy,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEVERITY_CONFIG: Record<FindingSeverity, { label: string; color: string; bg: string; border: string; icon: typeof AlertTriangle }> = {
  critical: { label: "CRITICAL", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900", icon: XCircle },
  error:    { label: "ERROR",    color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-900", icon: AlertTriangle },
  warn:     { label: "WARN",     color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900", icon: AlertTriangle },
  info:     { label: "INFO",     color: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-950/30",  border: "border-blue-200 dark:border-blue-900",  icon: Info },
};

const STEP_STATUS_ICON: Record<ProbeStep["status"], typeof CheckCircle> = {
  ok: CheckCircle,
  timeout: Clock,
  error: XCircle,
};

const STEP_STATUS_COLOR: Record<ProbeStep["status"], string> = {
  ok: "text-green-500",
  timeout: "text-amber-500",
  error: "text-red-500",
};

/* ------------------------------------------------------------------ */
/*  Safe snapshot builder — metadata ONLY, never PII                  */
/* ------------------------------------------------------------------ */

function buildSafeSnapshot(
  steps: ProbeStep[],
  findings: DiagnosticFinding[],
  auth: { role: string | null; isAuthenticated: boolean; isLoading: boolean; error: string | null },
) {
  const severityCount = { critical: 0, error: 0, warn: 0, info: 0 };
  for (const f of findings) {
    severityCount[f.severity] += 1;
  }

  return {
    timestamp: new Date().toISOString(),
    diagnosticsEnabled: isDiagnosticsEnabled(),
    summary: {
      totalFindings: findings.length,
      severityCount,
      totalSteps: steps.length,
      totalStepDurationMs: steps.reduce((s, x) => s + x.durationMs, 0),
    },
    findings: findings.map((f) => ({
      patternId: f.patternId,
      severity: f.severity,
      message: f.message,
      remediation: f.remediation,
      count: f.count ?? 1,
      timestamp: f.timestamp,
    })),
    timing: steps.map((s) => ({
      name: s.name,
      durationMs: s.durationMs,
      status: s.status,
      detail: s.detail ?? null,
    })),
    auth: {
      hasRole: !!auth.role,
      role: auth.role,
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
    },
    storage: captureStorageSnapshot(),
    supabaseConnected: isSupabaseConnected(),
  };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", cfg.bg, cfg.color)}>
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StepTimingBar({ step, maxMs }: { step: ProbeStep; maxMs: number }) {
  const pct = maxMs > 0 ? Math.min((step.durationMs / maxMs) * 100, 100) : 0;
  const Icon = STEP_STATUS_ICON[step.status];
  const color = STEP_STATUS_COLOR[step.status];

  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">{step.name}</span>
          <span className="ml-2 shrink-0 tabular-nums text-neutral-500">{step.durationMs}ms</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className={cn("h-full rounded-full transition-all", {
              "bg-green-500": step.status === "ok",
              "bg-amber-500": step.status === "timeout",
              "bg-red-500": step.status === "error",
            })}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function BoolIndicator({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={cn("h-2 w-2 rounded-full", value ? "bg-green-500" : "bg-red-400")} />
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className={cn("ml-auto font-mono font-medium tabular-nums", value ? "text-green-600" : "text-red-500")}>
        {String(value)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function AuthDiagnosticsPanel() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);

  const [steps, setSteps] = useState<ProbeStep[]>([]);
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [supabaseOk, setSupabaseOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    timeline: true,
    auth: true,
    findings: true,
    events: false,
    storage: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Poll diagnostics state ---- */
  const refresh = useCallback(() => {
    setSteps(authHydrationProbe.getSteps());
    setFindings(diagnosticRepo.getFindings());
    setEvents(telemetryBus.getRecent(50));
    setSupabaseOk(isSupabaseConnected());
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  /* ---- Derived state ---- */
  const maxStepMs = steps.length > 0 ? Math.max(...steps.map((s) => s.durationMs), 100) : 100;
  const severityCounts = { critical: 0, error: 0, warn: 0, info: 0 };
  for (const f of findings) severityCounts[f.severity] += 1;

  /* ---- Actions ---- */
  const handleClear = () => {
    diagnosticRepo.clear();
    authHydrationProbe.reset();
    telemetryBus.clear();
    refresh();
  };

  const handleCopy = async () => {
    const snap = buildSafeSnapshot(steps, findings, {
      role: user?.role ?? null,
      isAuthenticated,
      isLoading,
      error: authError,
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify(snap, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---- Guard: feature flag ---- */
  if (!isDiagnosticsEnabled()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Auth Diagnostics Disabled
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400/80">
              Set <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/40">NEXT_PUBLIC_ENABLE_AUTH_DIAGNOSTICS=true</code>{" "}
              in your environment to enable this panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Guard: access control ---- */
  if (!isSuperAdmin(user?.role)) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/20">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Restricted Access
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
              This panel is only visible to Super Admin users.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Main panel ---- */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Auth Hydration Diagnostics
          </h2>
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Snapshot
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Severity summary bar */}
      <div className="grid grid-cols-4 gap-2">
        {(["critical", "error", "warn", "info"] as FindingSeverity[]).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          const count = severityCounts[sev];
          return (
            <div
              key={sev}
              className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", cfg.border, cfg.bg)}
            >
              <cfg.icon className={cn("h-4 w-4", cfg.color)} />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{cfg.label}</span>
              <span className={cn("ml-auto text-sm font-bold tabular-nums", cfg.color)}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* ---- Hydration Timeline ---- */}
      <Section
        title="Hydration Timeline"
        icon={Clock}
        expanded={expandedSections.timeline}
        onToggle={() => toggleSection("timeline")}
        badge={steps.length > 0 ? `${steps.length} steps` : undefined}
      >
        {steps.length === 0 ? (
          <EmptyState message="No probe steps recorded yet. Navigate through a protected page to trigger hydration." />
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <StepTimingBar key={`${step.name}-${i}`} step={step} maxMs={maxStepMs} />
            ))}
          </div>
        )}
      </Section>

      {/* ---- Auth State ---- */}
      <Section
        title="Current Auth State"
        icon={Shield}
        expanded={expandedSections.auth}
        onToggle={() => toggleSection("auth")}
      >
        <div className="space-y-2.5">
          <BoolIndicator value={isAuthenticated} label="isAuthenticated" />
          <BoolIndicator value={!!user} label="hasUser" />
          <BoolIndicator value={isLoading} label="isLoading (auth store)" />
          <BoolIndicator value={supabaseOk} label="supabaseConnected" />
          <BoolIndicator value={isDiagnosticsEnabled()} label="diagnosticsEnabled" />
          {isAuthenticated && (
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-neutral-600 dark:text-neutral-400">role</span>
              <span className="ml-auto rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {user?.role ?? "null"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-neutral-600 dark:text-neutral-400">tenantId present</span>
            <span className={cn("ml-auto font-mono font-medium tabular-nums", user?.tenantId ? "text-green-600" : "text-red-500")}>
              {user?.tenantId ? "yes" : "no"}
            </span>
          </div>
          {authError && (
            <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
              Error: {authError}
            </div>
          )}
        </div>
      </Section>

      {/* ---- Storage Snapshot ---- */}
      <Section
        title="Storage Snapshot"
        icon={HardDrive}
        expanded={expandedSections.storage}
        onToggle={() => toggleSection("storage")}
      >
        <StorageInfo />
      </Section>

      {/* ---- Findings ---- */}
      <Section
        title="Diagnostic Findings"
        icon={AlertTriangle}
        expanded={expandedSections.findings}
        onToggle={() => toggleSection("findings")}
        badge={findings.length > 0 ? `${findings.length}` : "0"}
      >
        {findings.length === 0 ? (
          <EmptyState message="No findings detected. Auth hydration is healthy." />
        ) : (
          <div className="space-y-2">
            {findings.map((f, i) => {
              const cfg = SEVERITY_CONFIG[f.severity];
              return (
                <div
                  key={`${f.patternId}-${i}`}
                  className={cn("rounded-lg border p-3", cfg.border, cfg.bg)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <span className="text-[11px] font-mono text-neutral-500">{f.patternId}</span>
                        {f.count && f.count > 1 && (
                          <span className="rounded bg-neutral-200 px-1 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                            x{f.count}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">{f.message}</p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        <span className="font-medium">Fix:</span> {f.remediation}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
                      {new Date(f.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ---- Recent Telemetry Events ---- */}
      <Section
        title="Recent Telemetry Events"
        icon={Server}
        expanded={expandedSections.events}
        onToggle={() => toggleSection("events")}
        badge={events.length > 0 ? `${events.length}` : undefined}
      >
        {events.length === 0 ? (
          <EmptyState message="No telemetry events yet." />
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {events.slice(0, 30).map((evt) => (
              <div
                key={evt.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-[11px] hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", {
                  "bg-red-500": evt.level === "error",
                  "bg-amber-500": evt.level === "warn",
                  "bg-blue-500": evt.level === "info",
                })} />
                <span className="w-14 shrink-0 font-mono text-neutral-400 tabular-nums">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  {evt.source}
                </span>
                <span className="truncate text-neutral-600 dark:text-neutral-400">{evt.message}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
  badge,
}: {
  title: string;
  icon: typeof Activity;
  expanded: boolean | undefined;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Icon className="h-4 w-4 text-neutral-400" />
        <span className="flex-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          {title}
        </span>
        {badge && (
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-neutral-500 dark:bg-neutral-800">
            {badge}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-neutral-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-4 text-xs text-neutral-400 dark:bg-neutral-800/50">
      <Info className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  );
}

function StorageInfo() {
  const [storage, setStorage] = useState<ReturnType<typeof captureStorageSnapshot>>(null);

  useEffect(() => {
    setStorage(captureStorageSnapshot());
  }, []);

  if (!storage) {
    return <EmptyState message="Storage not available (server-side or disabled)." />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-600 dark:text-neutral-400">Supabase cookies</span>
        <span className="font-mono font-medium tabular-nums text-neutral-600">{storage.cookieCount}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-600 dark:text-neutral-400">LocalStorage keys (app)</span>
        <span className="font-mono font-medium tabular-nums text-neutral-600">{storage.localStorageCount}</span>
      </div>
      {storage.localStorageKeys.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {storage.localStorageKeys.map((key) => (
            <span
              key={key}
              className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:bg-neutral-800"
            >
              {key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
