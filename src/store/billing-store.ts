"use client";

import { create } from "zustand";
import type { Subscription, Payment, TenantQuotaInfo, TenantPackage, QuotaCheckResult } from "@/types";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { PACKAGE_DEFAULTS, checkQuotaAllowed } from "@/lib/billing/package-limits";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BillingState {
  subscriptions: Subscription[];
  payments: Payment[];
  quotas: Record<string, TenantQuotaInfo>;
  isLoading: boolean;
  error: string | null;

  loadSubscriptions(): Promise<void>;
  loadPayments(tenantId: string): Promise<void>;
  loadQuotaInfo(tenantId: string): Promise<void>;
  checkQuota(tenantId: string, resource: "users" | "branches" | "products"): Promise<QuotaCheckResult>;
  clear(): void;
}

/* ------------------------------------------------------------------ */
/*  Demo seed data                                                     */
/* ------------------------------------------------------------------ */

const DEMO_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub-001",
    tenantId: "pharm-001",
    packageId: "professional",
    status: "active",
    currentPeriodStart: "2026-05-01T00:00:00Z",
    currentPeriodEnd: "2026-06-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "sub-002",
    tenantId: "pharm-002",
    packageId: "basic",
    status: "active",
    currentPeriodStart: "2026-05-01T00:00:00Z",
    currentPeriodEnd: "2026-06-01T00:00:00Z",
    createdAt: "2026-02-15T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "sub-003",
    tenantId: "pharm-003",
    packageId: "enterprise",
    status: "past_due",
    currentPeriodStart: "2026-04-01T00:00:00Z",
    currentPeriodEnd: "2026-05-01T00:00:00Z",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  },
  {
    id: "sub-004",
    tenantId: "pharm-004",
    packageId: "basic",
    status: "canceled",
    currentPeriodStart: "2026-03-01T00:00:00Z",
    currentPeriodEnd: "2026-04-01T00:00:00Z",
    canceledAt: "2026-04-15T00:00:00Z",
    createdAt: "2026-01-10T00:00:00Z",
    updatedAt: "2026-04-15T00:00:00Z",
  },
];

const DEMO_PAYMENTS: Payment[] = [
  {
    id: "pay-001",
    subscriptionId: "sub-001",
    tenantId: "pharm-001",
    amount: 299000,
    currency: "IDR",
    status: "success",
    paymentMethod: "transfer_bank",
    paidAt: "2026-05-01T08:00:00Z",
    createdAt: "2026-05-01T08:00:00Z",
  },
  {
    id: "pay-002",
    subscriptionId: "sub-001",
    tenantId: "pharm-001",
    amount: 299000,
    currency: "IDR",
    status: "success",
    paymentMethod: "transfer_bank",
    paidAt: "2026-04-01T08:00:00Z",
    createdAt: "2026-04-01T08:00:00Z",
  },
  {
    id: "pay-003",
    subscriptionId: "sub-002",
    tenantId: "pharm-002",
    amount: 99000,
    currency: "IDR",
    status: "success",
    paymentMethod: "kartu_kredit",
    paidAt: "2026-05-01T09:30:00Z",
    createdAt: "2026-05-01T09:30:00Z",
  },
  {
    id: "pay-004",
    subscriptionId: "sub-003",
    tenantId: "pharm-003",
    amount: 999000,
    currency: "IDR",
    status: "failed",
    paymentMethod: "transfer_bank",
    paidAt: null,
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "pay-005",
    subscriptionId: "sub-003",
    tenantId: "pharm-003",
    amount: 999000,
    currency: "IDR",
    status: "pending",
    paymentMethod: "kartu_kredit",
    paidAt: null,
    createdAt: "2026-05-05T14:00:00Z",
  },
  {
    id: "pay-006",
    subscriptionId: "sub-004",
    tenantId: "pharm-004",
    amount: 99000,
    currency: "IDR",
    status: "refunded",
    paymentMethod: "transfer_bank",
    paidAt: "2026-04-01T07:00:00Z",
    createdAt: "2026-04-01T07:00:00Z",
  },
];

const DEMO_QUOTAS: Record<string, TenantQuotaInfo> = {
  "pharm-001": { packageName: "professional", maxUsers: 10, currentUsers: 7, maxBranches: 3, currentBranches: 2, maxProducts: 1000 },
  "pharm-002": { packageName: "basic", maxUsers: 3, currentUsers: 3, maxBranches: 1, currentBranches: 1, maxProducts: 200 },
  "pharm-003": { packageName: "enterprise", maxUsers: 50, currentUsers: 12, maxBranches: 10, currentBranches: 3, maxProducts: 10000 },
  "pharm-004": { packageName: "basic", maxUsers: 3, currentUsers: 1, maxBranches: 1, currentBranches: 0, maxProducts: 200 },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function mapSubscriptionRow(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id ?? ""),
    tenantId: String(row.tenant_id ?? ""),
    packageId: String(row.package_id ?? ""),
    status: (row.status as Subscription["status"]) ?? "active",
    currentPeriodStart: String(row.current_period_start ?? ""),
    currentPeriodEnd: String(row.current_period_end ?? ""),
    trialEnd: row.trial_end ? String(row.trial_end) : null,
    canceledAt: row.canceled_at ? String(row.canceled_at) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id ?? ""),
    subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
    tenantId: String(row.tenant_id ?? ""),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "IDR"),
    status: (row.status as Payment["status"]) ?? "pending",
    paymentMethod: row.payment_method ? String(row.payment_method) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at ?? ""),
  };
}

/* ------------------------------------------------------------------ */
/*  Store                                                               */
/* ------------------------------------------------------------------ */

export const useBillingStore = create<BillingState>((set, get) => ({
  subscriptions: [],
  payments: [],
  quotas: {},
  isLoading: false,
  error: null,

  loadSubscriptions: async () => {
    if (checkDemoMode()) {
      const user = useAuthStore.getState().user;
      if (user && !isSuperAdmin(user.role) && user.tenantId) {
        set({
          subscriptions: DEMO_SUBSCRIPTIONS.filter((s) => s.tenantId === user.tenantId),
          isLoading: false,
          error: null,
        });
      } else {
        set({ subscriptions: DEMO_SUBSCRIPTIONS, isLoading: false, error: null });
      }
      return;
    }

    if (!isSupabaseConnected()) {
      set({ subscriptions: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      let query = supabase!.from("subscriptions").select("*");

      if (user && !isSuperAdmin(user.role) && user.tenantId) {
        query = query.eq("tenant_id", user.tenantId);
      }

      const { data, error } = await query;

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      const subscriptions: Subscription[] = (data ?? []).map(mapSubscriptionRow);
      set({ subscriptions, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadPayments: async (tenantId: string) => {
    if (checkDemoMode()) {
      set({
        payments: DEMO_PAYMENTS.filter((p) => p.tenantId === tenantId),
        isLoading: false,
        error: null,
      });
      return;
    }

    if (!isSupabaseConnected()) {
      set({ payments: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase!
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      const payments: Payment[] = (data ?? []).map(mapPaymentRow);
      set({ payments, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadQuotaInfo: async (tenantId: string) => {
    if (checkDemoMode()) {
      const cached = (get().quotas[tenantId] as TenantQuotaInfo | undefined) ?? DEMO_QUOTAS[tenantId];
      if (cached) {
        set((s) => ({
          quotas: { ...s.quotas, [tenantId]: cached },
          isLoading: false,
          error: null,
        }));
      }
      return;
    }

    if (!isSupabaseConnected()) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Fetch tenant info for package
      const tenantResp = await supabase!
        .from("tenants")
        .select("package_id")
        .eq("id", tenantId)
        .maybeSingle();

      if (tenantResp.error || !tenantResp.data) {
        set({ error: tenantResp.error?.message ?? "Tenant tidak ditemukan", isLoading: false });
        return;
      }

      const rawPackageId = (tenantResp.data as { package_id: string | null }).package_id ?? "basic";
      const packageName: TenantPackage = (["basic", "professional", "enterprise"].includes(rawPackageId) ? rawPackageId : "basic") as TenantPackage;

      // Fetch user count
      const { count: userCount, error: userError } = await supabase!
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      // Fetch branch count from branches table
      const { count: branchCount, error: branchError } = await supabase!
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      // Fetch product count
      const { count: productCount, error: productError } = await supabase!
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      if (userError || branchError || productError) {
        set({
          error: [userError, branchError, productError].find(Boolean)?.message ?? "Gagal memuat kuota",
          isLoading: false,
        });
        return;
      }

      const limits = PACKAGE_DEFAULTS[packageName];

      const quotaInfo: TenantQuotaInfo = {
        packageName,
        maxUsers: limits.maxUsers,
        currentUsers: userCount ?? 0,
        maxBranches: limits.maxBranches,
        currentBranches: branchCount ?? 0,
        maxProducts: productCount ?? 0,
      };

      set((s) => ({
        quotas: { ...s.quotas, [tenantId]: quotaInfo },
        isLoading: false,
        error: null,
      }));
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  checkQuota: async (tenantId: string, resource: "users" | "branches" | "products") => {
    // Try to get from local quota cache first
    const cached = get().quotas[tenantId] as TenantQuotaInfo | undefined;

    if (cached) {
      const currentKey = resource === "users" ? "currentUsers" : resource === "branches" ? "currentBranches" : "currentProducts";
      const maxKey = resource === "users" ? "maxUsers" : resource === "branches" ? "maxBranches" : "maxProducts";

      const current = cached[currentKey as keyof TenantQuotaInfo] as number;
      const max = cached[maxKey as keyof TenantQuotaInfo] as number;

      return checkQuotaAllowed(current, max, resource);
    }

    // If not cached, fall back to demo or empty check
    if (checkDemoMode()) {
      const demoQuota = DEMO_QUOTAS[tenantId];
      if (demoQuota) {
        const currentKey = resource === "users" ? "currentUsers" : resource === "branches" ? "currentBranches" : "currentProducts";
        const maxKey = resource === "users" ? "maxUsers" : resource === "branches" ? "maxBranches" : "maxProducts";
        const current = demoQuota[currentKey as keyof TenantQuotaInfo] as number;
        const max = demoQuota[maxKey as keyof TenantQuotaInfo] as number;
        return checkQuotaAllowed(current, max, resource);
      }
    }

    // Default: allowed but empty
    return { allowed: true, current: 0, max: 0, resource };
  },

  clear: () => {
    set({
      subscriptions: [],
      payments: [],
      quotas: {},
      isLoading: false,
      error: null,
    });
  },
}));
