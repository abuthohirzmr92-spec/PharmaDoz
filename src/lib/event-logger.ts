"use client";

import type { EventLevel, EventCategory, OperationalEvent } from "@/types";
import { EVENT_LOG_MAX_SIZE } from "@/config/constants";

let eventCounter = 0;

function generateEventId(): string {
  eventCounter++;
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}-${eventCounter}`;
}

interface LogParams {
  level: EventLevel;
  category: EventCategory;
  message: string;
  details?: Record<string, unknown> | null;
  pharmacyId?: string | null;
}

export function createOperationalEvent(params: LogParams): OperationalEvent {
  return {
    id: generateEventId(),
    level: params.level,
    category: params.category,
    message: params.message,
    details: params.details ?? null,
    pharmacyId: params.pharmacyId ?? null,
    timestamp: new Date().toISOString(),
  };
}

// Category-specific loggers
export function logTransactionFail(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "error",
    category: "transaction",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

export function logAuthAnomaly(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "warn",
    category: "auth",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

export function logMaintenanceAction(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "info",
    category: "maintenance",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

export function logSyncAnomaly(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "warn",
    category: "sync",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

export function logNetworkDegradation(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "warn",
    category: "network",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

export function logPermissionDenial(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "warn",
    category: "permission",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

export function logRetryAttempt(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "info",
    category: "recovery",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

export function logBackupOperation(
  message: string,
  details?: Record<string, unknown>,
  pharmacyId?: string,
) {
  return createOperationalEvent({
    level: "info",
    category: "backup",
    message,
    details: details ?? null,
    pharmacyId: pharmacyId ?? null,
  });
}

// Ring buffer implementation
export function createRingBuffer(maxSize?: number) {
  const limit = maxSize ?? EVENT_LOG_MAX_SIZE;
  let buffer: OperationalEvent[] = [];

  return {
    push(event: OperationalEvent) {
      buffer.push(event);
      if (buffer.length > limit) {
        buffer = buffer.slice(buffer.length - limit);
      }
    },
    getAll(): OperationalEvent[] {
      return [...buffer];
    },
    getByLevel(level: EventLevel): OperationalEvent[] {
      return buffer.filter((e) => e.level === level);
    },
    getByCategory(category: EventCategory): OperationalEvent[] {
      return buffer.filter((e) => e.category === category);
    },
    getErrors(): OperationalEvent[] {
      return buffer.filter((e) => e.level === "error" || e.level === "critical");
    },
    getRecent(n: number): OperationalEvent[] {
      return buffer.slice(-n).reverse();
    },
    clear() {
      buffer = [];
    },
    size(): number {
      return buffer.length;
    },
  };
}

// Generate demo events
export function generateDemoEvents(): OperationalEvent[] {
  const events: OperationalEvent[] = [];
  const now = Date.now();
  const pharmacies = ["pharm-001", "pharm-002", null];
  const scenarios = [
    {
      level: "error" as EventLevel,
      category: "transaction" as EventCategory,
      message: "Transaksi gagal: koneksi database terputus",
    },
    {
      level: "warn" as EventLevel,
      category: "auth" as EventCategory,
      message: "Percobaan login gagal — 3x berturut-turut",
    },
    {
      level: "info" as EventLevel,
      category: "maintenance" as EventCategory,
      message: "Maintenance mode diaktifkan untuk pharm-001",
    },
    {
      level: "warn" as EventLevel,
      category: "sync" as EventCategory,
      message: "Sync batch gagal setelah 3x retry",
    },
    {
      level: "warn" as EventLevel,
      category: "network" as EventCategory,
      message: "Koneksi terdegradasi — latency > 5000ms",
    },
    {
      level: "warn" as EventLevel,
      category: "permission" as EventCategory,
      message: "Akses ditolak: cashier mencoba akses halaman admin",
    },
    {
      level: "info" as EventLevel,
      category: "recovery" as EventCategory,
      message: "Retry transaksi berhasil setelah 2x percobaan",
    },
    {
      level: "info" as EventLevel,
      category: "backup" as EventCategory,
      message: "Backup harian selesai — 45MB",
    },
    {
      level: "critical" as EventLevel,
      category: "transaction" as EventCategory,
      message: "Transaksi gagal: FEFO allocation error",
    },
    {
      level: "debug" as EventLevel,
      category: "sync" as EventCategory,
      message: "Sync health check — semua batch normal",
    },
  ];

  for (let i = 0; i < 25; i++) {
    const s = scenarios[i % scenarios.length];
    if (s == null) continue;
    events.push({
      id: `evt-demo-${i}`,
      level: s.level,
      category: s.category,
      message: s.message,
      details: { attempt: i + 1, source: "demo-generator" },
      pharmacyId: pharmacies[i % pharmacies.length] ?? null,
      timestamp: new Date(now - i * 1800000).toISOString(),
    });
  }
  return events;
}
