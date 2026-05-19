"use client";

import type { RecoveryAction, RecoveryState } from "@/types";
import { RECOVERY_MAX_RETRIES, RECOVERY_RETRY_DELAY_MS } from "@/config/constants";

/* ------------------------------------------------------------------ */
/*  ID Generator                                                       */
/* ------------------------------------------------------------------ */

let actionCounter = 0;

function generateRecoveryId(): string {
  actionCounter++;
  return `rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}-${actionCounter}`;
}

/* ------------------------------------------------------------------ */
/*  Params type                                                        */
/* ------------------------------------------------------------------ */

export interface CreateRecoveryActionParams {
  type: string;
  maxAttempts?: number;
}

/* ------------------------------------------------------------------ */
/*  Core helpers                                                       */
/* ------------------------------------------------------------------ */

export function createRecoveryAction(params: CreateRecoveryActionParams): RecoveryAction {
  return {
    id: generateRecoveryId(),
    type: params.type,
    status: "pending",
    attempts: 0,
    maxAttempts: params.maxAttempts ?? RECOVERY_MAX_RETRIES,
    lastAttempt: null,
    error: null,
    result: null,
  };
}

export function attemptRecovery(action: RecoveryAction): RecoveryAction {
  return {
    ...action,
    status: "retrying",
    attempts: action.attempts + 1,
    lastAttempt: new Date().toISOString(),
  };
}

export function completeRecovery(action: RecoveryAction, result?: Record<string, unknown>): RecoveryAction {
  return {
    ...action,
    status: "completed",
    result: result ?? null,
    lastAttempt: new Date().toISOString(),
  };
}

export function failRecovery(action: RecoveryAction, error: string): RecoveryAction {
  const canRetry = action.attempts < action.maxAttempts;
  return {
    ...action,
    status: canRetry ? "pending" : "failed",
    error,
    lastAttempt: new Date().toISOString(),
  };
}

export function canRetryRecovery(action: RecoveryAction): boolean {
  return action.status !== "completed" && action.attempts < action.maxAttempts;
}

export function getNextRetryDelay(action: RecoveryAction): number {
  // Exponential backoff: base * 2^attempts, capped at 30s
  const delay = RECOVERY_RETRY_DELAY_MS * Math.pow(2, action.attempts);
  return Math.min(delay, 30000);
}

export function getRecoveryState(actions: RecoveryAction[]): RecoveryState {
  if (actions.length === 0) return "idle";
  const hasFailed = actions.some((a) => a.status === "failed");
  const hasRetrying = actions.some((a) => a.status === "retrying");
  const allComplete = actions.every((a) => a.status === "completed");

  if (hasRetrying) return "retrying";
  if (hasFailed && allComplete) return "degraded";
  if (hasFailed) return "degraded";
  if (allComplete) return "restored";
  return "idle";
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

export function generateDemoRecoveryActions(): RecoveryAction[] {
  const now = Date.now();
  return [
    {
      id: "rec-demo-1",
      type: "transaction_retry",
      status: "completed",
      attempts: 2,
      maxAttempts: 3,
      lastAttempt: new Date(now - 60000).toISOString(),
      error: null,
      result: { recovered: true, invoiceNumber: "INV-2026-001" },
    },
    {
      id: "rec-demo-2",
      type: "sync_retry",
      status: "retrying",
      attempts: 1,
      maxAttempts: 3,
      lastAttempt: new Date(now - 30000).toISOString(),
      error: "Network timeout — 5000ms",
      result: null,
    },
    {
      id: "rec-demo-3",
      type: "session_recovery",
      status: "completed",
      attempts: 1,
      maxAttempts: 3,
      lastAttempt: new Date(now - 300000).toISOString(),
      error: null,
      result: { sessionRestored: true },
    },
    {
      id: "rec-demo-4",
      type: "sync_retry",
      status: "failed",
      attempts: 3,
      maxAttempts: 3,
      lastAttempt: new Date(now - 600000).toISOString(),
      error: "Checksum mismatch setelah 3x percobaan",
      result: null,
    },
    {
      id: "rec-demo-5",
      type: "transaction_retry",
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      lastAttempt: null,
      error: null,
      result: null,
    },
  ];
}
