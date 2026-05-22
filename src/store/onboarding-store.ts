"use client";

import { create } from "zustand";
import type { OnboardingStep, OnboardingState } from "@/types";
import {
  getOnboardingState,
  advanceStep,
  completeOnboarding,
} from "@/lib/tenant/onboarding-state";

interface OnboardingStore {
  state: OnboardingState | null;
  isLoading: boolean;
  error: string | null;

  load: (tenantId: string) => Promise<void>;
  advance: (
    tenantId: string,
    currentStep: OnboardingStep,
    stepData?: Record<string, unknown>,
  ) => Promise<boolean>;
  complete: (tenantId: string) => Promise<boolean>;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  state: null,
  isLoading: false,
  error: null,

  load: async (tenantId) => {
    if (!tenantId) return;
    set({ isLoading: true, error: null });
    try {
      const state = await getOnboardingState(tenantId);
      set({ state, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  advance: async (tenantId, currentStep, stepData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await advanceStep(tenantId, currentStep, stepData);
      if (result.success) {
        // Reload state after advancing
        const updated = await getOnboardingState(tenantId);
        set({ state: updated, isLoading: false });
        return true;
      }
      set({ error: result.error ?? "Gagal melanjutkan onboarding.", isLoading: false });
      return false;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return false;
    }
  },

  complete: async (tenantId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await completeOnboarding(tenantId);
      if (result.success) {
        const updated = await getOnboardingState(tenantId);
        set({ state: updated, isLoading: false });
        return true;
      }
      set({ error: result.error ?? "Gagal menyelesaikan onboarding.", isLoading: false });
      return false;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return false;
    }
  },

  reset: () => {
    set({ state: null, isLoading: false, error: null });
  },
}));
