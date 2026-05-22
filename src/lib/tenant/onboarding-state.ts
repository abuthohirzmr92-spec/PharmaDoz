"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { generateSlug } from "./onboarding";
import type { OnboardingStep, OnboardingState } from "@/types";

export async function getOnboardingState(
  tenantId: string,
): Promise<OnboardingState | null> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { data, error } = await db
    .from("tenant_onboarding")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("getOnboardingState error:", error.message);
    return null;
  }

  const row = data;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    currentStep: row.current_step as OnboardingStep,
    stepsCompleted: row.steps_completed ?? [],
    data: row.data ?? {},
    isCompleted: row.is_completed ?? false,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "profile_setup",
  "branch_setup",
  "product_setup",
  "team_invite",
  "done",
];

export async function advanceStep(
  tenantId: string,
  currentStep: OnboardingStep,
  stepData?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return { success: false, error: "Invalid step transition." };
  }

  const nextStep = STEP_ORDER[currentIndex + 1]!;

  const { data: existing } = await db
    .from("tenant_onboarding")
    .select("steps_completed, data")
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) {
    return { success: false, error: "Onboarding state not found." };
  }

  const stepsCompleted = existing.steps_completed ?? [];
  const existingData = existing.data ?? {};

  const stepRecord = {
    step: currentStep,
    completedAt: new Date().toISOString(),
  };

  const alreadyCompleted = stepsCompleted.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.step === currentStep,
  );

  const nextStepsCompleted = alreadyCompleted
    ? stepsCompleted
    : [...stepsCompleted, stepRecord];

  const mergedData = stepData
    ? { ...existingData, [currentStep]: stepData }
    : existingData;

  const { error } = await db
    .from("tenant_onboarding")
    .update({
      current_step: nextStep,
      steps_completed: nextStepsCompleted,
      data: mergedData,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("advanceStep error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function completeOnboarding(
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;

  const { error } = await db
    .from("tenant_onboarding")
    .update({
      current_step: "done",
      is_completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("completeOnboarding error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Save pharmacy profile during onboarding step "profile_setup".
 * Updates both tenants table and the main branch.
 */
export async function savePharmacyProfile(
  tenantId: string,
  profile: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabase;
  const slug = generateSlug(profile.name);

  const { error: updateError } = await db
    .from("tenants")
    .update({
      name: profile.name,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: branchError } = await db
    .from("branches")
    .update({
      name: profile.name + " - Utama",
      address: profile.address ?? null,
      phone: profile.phone ?? null,
      email: profile.email ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("is_main", true);

  if (branchError) {
    console.error("savePharmacyProfile branch update error:", branchError.message);
  }

  return { success: true };
}
