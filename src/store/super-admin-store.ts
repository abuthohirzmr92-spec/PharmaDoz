"use client";

import { create } from "zustand";
import type { TenantSummary, PlatformStats, PlatformHealth, ActivityLog } from "@/types";
import { superAdminRepo } from "@/lib/repository-instances";
import { isDemoMode as checkDemoMode } from "@/config/env";

interface SuperAdminState {
  tenants: TenantSummary[];
  stats: PlatformStats | null;
  health: PlatformHealth | null;
  activities: ActivityLog[];
  isLoading: boolean;
  error: string | null;

  loadTenants(): Promise<void>;
  loadStats(): Promise<void>;
  loadHealth(): Promise<void>;
  loadActivities(): Promise<void>;
  loadAll(): Promise<void>;

  suspendTenant(tenantId: string): Promise<boolean>;
  activateTenant(tenantId: string): Promise<boolean>;

  clear(): void;
}

export const useSuperAdminStore = create<SuperAdminState>((set, get) => ({
  tenants: [],
  stats: null,
  health: null,
  activities: [],
  isLoading: false,
  error: null,

  loadTenants: async () => {
    if (checkDemoMode()) return;
    set({ isLoading: true, error: null });
    try {
      const tenants = await superAdminRepo.getAllTenants();
      set({ tenants, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadStats: async () => {
    if (checkDemoMode()) return;
    set({ isLoading: true, error: null });
    try {
      const stats = await superAdminRepo.getPlatformStats();
      set({ stats, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadHealth: async () => {
    if (checkDemoMode()) return;
    set({ isLoading: true, error: null });
    try {
      const health = await superAdminRepo.getPlatformHealth();
      set({ health, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadActivities: async () => {
    if (checkDemoMode()) return;
    try {
      const activities = await superAdminRepo.getActivityLogs(50);
      set({ activities });
    } catch {
      // non-critical, ignore
    }
  },

  loadAll: async () => {
    if (checkDemoMode()) return;
    set({ isLoading: true, error: null });
    try {
      const [tenants, stats, health, activities] = await Promise.all([
        superAdminRepo.getAllTenants(),
        superAdminRepo.getPlatformStats(),
        superAdminRepo.getPlatformHealth(),
        superAdminRepo.getActivityLogs(50),
      ]);
      set({ tenants, stats, health, activities, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  suspendTenant: async (tenantId) => {
    try {
      const ok = await superAdminRepo.suspendTenant(tenantId);
      if (ok) {
        set((s) => ({
          tenants: s.tenants.map((t) =>
            t.pharmacyId === tenantId ? { ...t, isActive: false } : t
          ),
        }));
      }
      return ok;
    } catch {
      return false;
    }
  },

  activateTenant: async (tenantId) => {
    try {
      const ok = await superAdminRepo.activateTenant(tenantId);
      if (ok) {
        set((s) => ({
          tenants: s.tenants.map((t) =>
            t.pharmacyId === tenantId ? { ...t, isActive: true } : t
          ),
        }));
      }
      return ok;
    } catch {
      return false;
    }
  },

  clear() {
    set({ tenants: [], stats: null, health: null, activities: [], isLoading: false, error: null });
  },
}));
