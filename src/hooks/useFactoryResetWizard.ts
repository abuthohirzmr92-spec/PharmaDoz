"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FactoryResetStage, WizardState } from "@/components/settings/factory-reset/types";
import { NEXT_STAGE } from "@/components/settings/factory-reset/types";

const INITIAL: WizardState = {
  stage: "WARNING", preview: null, validation: null, confirmationText: "",
  progress: null, result: null, error: null, isLoading: false,
};

export function useFactoryResetWizard(_tenantId: string, _userId: string) {
  const [state, setState] = useState<WizardState>(INITIAL);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((stage: FactoryResetStage) => setState((s) => ({ ...s, stage, error: null })), []);

  const goNext = useCallback(() => {
    setState((s) => ({ ...s, stage: NEXT_STAGE[s.stage] ?? s.stage, error: null }));
  }, []);

  // ── Preview ──
  const loadPreview = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    // In production: calls previewReset(tenantId). For now: mock preview.
    await new Promise((r) => setTimeout(r, 500));
    setState((s) => ({
      ...s, isLoading: false,
      preview: [
        { table: "Sale Batch Allocations", count: 245 },
        { table: "Transaction Payments", count: 180 },
        { table: "Transaction Items", count: 312 },
        { table: "Transactions", count: 156 },
        { table: "Purchase Items", count: 89 },
        { table: "Stock Movements", count: 420 },
        { table: "Product Batches", count: 60 },
        { table: "Wallet Transactions", count: 34 },
        { table: "Stock Opname", count: 12 },
      ],
    }));
  }, []);

  // ── Validate ──
  const runValidation = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 500));
    setState((s) => ({
      ...s, isLoading: false,
      validation: {
        valid: true,
        checks: [
          { passed: true, rule: "tenant_exists", message: "Tenant exists" },
          { passed: true, rule: "tenant_active", message: "Tenant is active" },
          { passed: true, rule: "permission", message: "Permission granted" },
          { passed: true, rule: "no_reset_running", message: "No reset currently running" },
          { passed: true, rule: "ready", message: "Ready to continue" },
        ],
      },
    }));
  }, []);

  // ── Execute ──
  const execute = useCallback(async () => {
    setState((s) => ({ ...s, stage: "EXECUTING", isLoading: true }));
    const steps = ["delete-sales", "delete-purchase", "delete-inventory", "delete-batches", "delete-finance"];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const completed = steps.slice(0, i + 1);
      setState((s) => ({
        ...s,
        progress: {
          currentStep: completed[completed.length - 1] ?? null,
          completedSteps: completed,
          percentage: Math.round((completed.length / steps.length) * 100),
          status: "RUNNING",
        },
      }));
    }

    setState((s) => ({
      ...s, isLoading: false, stage: "COMPLETED",
      result: {
        success: true, deletedRows: 1496, durationMs: 4200,
        newLifecycleState: "READY_FOR_ICOB",
      },
    }));
  }, []);

  const setConfirmationText = useCallback((text: string) => setState((s) => ({ ...s, confirmationText: text })), []);
  const retry = useCallback(() => setState((s) => ({ ...s, stage: "CONFIRM", error: null, result: null })), []);
  const cancel = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setState((s) => ({ ...s, stage: "CANCELLED" }));
  }, []);
  const restart = useCallback(() => setState({ ...INITIAL }), []);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  return { state, goTo, goNext, loadPreview, runValidation, execute, setConfirmationText, retry, cancel, restart };
}
