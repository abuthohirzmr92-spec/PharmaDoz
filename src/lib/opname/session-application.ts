// ---------------------------------------------------------------------------
// RC1 P0H.3E — Session Application Facade (Thin Delegation Layer)
// ---------------------------------------------------------------------------
// Single entry point for all session operations.
// Used by Web, Mobile, Worker, CLI, Offline Sync, Approval.
// ZERO business logic. ZERO state. ZERO validation. Pure delegation.
// ---------------------------------------------------------------------------

import type { SessionExecutionContext } from "./session-context";
import type { SessionOperationResult } from "./contracts/session-operation-result";
import {
  startSessionOpname,
  pauseSessionOpname,
  resumeSessionOpname,
  completeSessionOpname,
  postSessionOpname,
  archiveSessionOpname,
  cancelSessionOpname,
  markItemCountedOpname,
  markItemsFromOpnameOpname,
} from "./session-lifecycle-service";

export type { SessionOperationResult };

export interface SessionApplicationFacade {
  /** Start a new opname session with location scope */
  start: (title: string, conductedBy: string, locationIds?: string[], batches?: Array<{ productId: string; batchId: string; quantity: number; productName?: string; rackLocation?: string | null }>) => string;
  /** Pause the active session */
  pause: () => Promise<SessionOperationResult>;
  /** Resume a paused session */
  resume: () => Promise<SessionOperationResult>;
  /** Mark session as complete */
  complete: () => Promise<SessionOperationResult>;
  /** Post adjustments (requires completed status) */
  post: () => Promise<SessionOperationResult>;
  /** Archive the session (requires posted or completed status) */
  archive: () => Promise<SessionOperationResult>;
  /** Cancel and clear the session */
  cancel: () => Promise<SessionOperationResult>;
  /** Mark a single batch item as counted */
  markItemCounted: (key: string, physicalQty?: number) => Promise<SessionOperationResult>;
  /** Batch mark items from opname */
  markItemsFromOpname: (items: Array<{ productId: string; batchId: string; physicalQty: number }>) => Promise<SessionOperationResult>;
}

/**
 * Create a session application facade for a given execution context.
 * All methods delegate to SessionLifecycleService — zero business logic here.
 *
 * RC1: facade wraps synchronous lifecycle calls in Promise.resolve().
 * RC2: replace Promise.resolve() with actual async operations (API, DB, etc.)
 * without changing any caller code.
 */
export function createSessionFacade(ctx: SessionExecutionContext): SessionApplicationFacade {
  return {
    start: (title, conductedBy, locationIds, batches) =>
      startSessionOpname(ctx, title, conductedBy, locationIds, batches),

    pause: () => Promise.resolve(pauseSessionOpname(ctx)),

    resume: () => Promise.resolve(resumeSessionOpname(ctx)),

    complete: () => Promise.resolve(completeSessionOpname(ctx)),

    post: () => Promise.resolve(postSessionOpname(ctx)),

    archive: () => Promise.resolve(archiveSessionOpname(ctx)),

    cancel: () => Promise.resolve(cancelSessionOpname(ctx)),

    markItemCounted: (key, physicalQty) =>
      Promise.resolve(markItemCountedOpname(ctx, key, physicalQty)),

    markItemsFromOpname: (items) =>
      Promise.resolve(markItemsFromOpnameOpname(ctx, items)),
  };
}
