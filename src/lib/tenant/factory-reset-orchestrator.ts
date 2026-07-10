// =================================================================
// MEDISYNC — Factory Reset Orchestrator (Session-Guarded v4)
// 🔒 Architecture Constitution v1.0
//
// Slim coordinator. Concurrency-guarded via FactoryResetSession.
// Orchestrates: Validate → Plan → Execute Steps → Finalize → Dispose.
// =================================================================

import type { FactoryResetResult, ResetHooks, StepResult } from "./factory-reset.types";
import { ResetValidation } from "./factory-reset-validation";
import { ResetPlanner } from "./factory-reset-planner";
import { TenantLifecycleMachine } from "./tenant-lifecycle-machine";
import { FactoryResetEventRecorder } from "./factory-reset-event-recorder";
import { FactoryResetSession } from "./factory-reset-session";

export class FactoryResetOrchestrator {
  private tenantId: string;
  private userId: string;
  private dryRun: boolean;
  private hooks: ResetHooks | null;
  private events!: FactoryResetEventRecorder;
  private session!: FactoryResetSession;

  constructor(tenantId: string, userId: string) {
    this.tenantId = tenantId;
    this.userId = userId;
    this.dryRun = false;
    this.hooks = null;
  }

  withDryRun(): this { this.dryRun = true; return this; }
  withHooks(hooks: ResetHooks): this { this.hooks = hooks; return this; }

  /** Read session progress for UI polling */
  getSession() { return this.session?.getRecord() ?? null; }

  async execute(): Promise<FactoryResetResult> {
    // Guard: create session — throws ConcurrencyError if already running
    this.session = new FactoryResetSession(this.tenantId, this.userId);
    this.events = new FactoryResetEventRecorder(this.tenantId);

    const t0 = Date.now();
    const lifecycle = new TenantLifecycleMachine(this.tenantId, "ACTIVE");

    try {
      this.session.markRunning();
      this.events.record("FactoryResetStarted", { dryRun: this.dryRun });

      // 1. Validate
      const report = await new ResetValidation(this.tenantId, this.userId).validate();
      if (!report.valid) {
        const msgs = report.checks.filter((c) => !c.passed).map((c) => c.message);
        return this.fail(`Validation: ${msgs.join("; ")}`, t0, lifecycle);
      }

      // 2. Plan
      const plan = new ResetPlanner(this.tenantId).build();
      this.session.updateProgress({ remainingSteps: plan.steps.map((s) => s.stepId) });

      // 3. Before hooks
      try { await this.hooks?.beforeReset?.(this.tenantId); } catch { /* non-blocking */ }

      // 4. Execute steps
      const results: StepResult[] = [];
      let deleted = 0;
      for (const step of plan.steps) {
        this.session.updateProgress({ currentStep: step.stepId });
        const res = await step.execute(this.tenantId, this.userId, this.dryRun);
        results.push(res);
        if (res.success) {
          deleted += res.rowsAffected;
          const completed = [...this.session.getProgress().completedSteps, step.stepId];
          this.session.updateProgress({
            completedSteps: completed,
            percentage: Math.round((completed.length / plan.steps.length) * 100),
          });
        } else if (!this.dryRun) {
          this.events.record("FactoryResetFailed", { step: step.stepId });
          return this.fail(res.error ?? `Step ${step.stepId} failed`, t0, lifecycle, results, deleted);
        }
      }

      // 5. Lifecycle
      if (!this.dryRun) lifecycle.transition("READY_FOR_ICOB");
      const finalState = lifecycle.getState();

      // 6. Hooks
      const final = this.makeResult(true, t0, results, deleted, finalState, null);
      try { await this.hooks?.afterReset?.(this.tenantId, final); } catch { /* non-blocking */ }

      this.events.record("FactoryResetCompleted", { totalDeleted: deleted });
      this.session.markCompleted(finalState);
      return final;
    } catch (err) {
      if (err instanceof Error && err.message.includes("already being reset")) {
        return this.makeResult(false, t0, [], 0, "ACTIVE", err.message);
      }
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.session?.markFailed(msg);
      return this.fail(msg, t0, lifecycle, [], 0);
    } finally {
      this.session?.dispose();
    }
  }

  private makeResult(success: boolean, t0: number, steps: StepResult[], deleted: number, lifecycleState: FactoryResetResult["newLifecycleState"], error: string | null): FactoryResetResult {
    return {
      success, tenantId: this.tenantId, completedAt: new Date().toISOString(),
      durationMs: Date.now() - t0, deletedTables: [], deletedRows: deleted, warnings: [],
      resetVersion: success ? 1 : 0, dryRun: this.dryRun, steps,
      newLifecycleState: lifecycleState, error: error ?? undefined,
    };
  }

  private fail(reason: string, t0: number, lifecycle: TenantLifecycleMachine, steps: StepResult[] = [], deleted = 0): FactoryResetResult {
    this.events.record("FactoryResetFailed", { reason });
    this.session.markFailed(reason);
    return this.makeResult(false, t0, steps, deleted, lifecycle.getState(), reason);
  }
}
