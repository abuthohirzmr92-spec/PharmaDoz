"use client";

import { create } from "zustand";
import type { AuditEntry, AuditFilter } from "@/types";
import { generateDemoAuditEntries } from "@/lib/audit/audit-logger";
import { MAX_AUDIT_PAGE_SIZE } from "@/config/constants";
import { isDemoMode as checkDemoMode } from "@/config/env";

interface AuditState {
  entries: AuditEntry[];
  isLoading: boolean;
  addEntry(entry: AuditEntry): void;
  addEntries(entries: AuditEntry[]): void;
  getFiltered(filter: AuditFilter): AuditEntry[];
  getByResource(resourceType: string, resourceId: string): AuditEntry[];
  getRecent(n: number): AuditEntry[];
  getPage(page: number, filter?: AuditFilter): { entries: AuditEntry[]; totalPages: number };
  seedDemo(): void;
  clear(): void;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  entries: checkDemoMode() ? generateDemoAuditEntries() : [],
  isLoading: false,

  addEntry(entry) {
    set((s) => ({ entries: [entry, ...s.entries] }));
  },

  addEntries(newEntries) {
    set((s) => ({ entries: [...newEntries, ...s.entries] }));
  },

  getFiltered(filter) {
    let result = get().entries;
    if (filter.action) result = result.filter((e) => e.action === filter.action);
    if (filter.actorId) result = result.filter((e) => e.actorId === filter.actorId);
    if (filter.resourceType) result = result.filter((e) => e.resourceType === filter.resourceType);
    if (filter.from) result = result.filter((e) => e.createdAt >= filter.from!);
    if (filter.to) result = result.filter((e) => e.createdAt <= filter.to!);
    return result;
  },

  getByResource(resourceType, resourceId) {
    return get().entries.filter(
      (e) => e.resourceType === resourceType && e.resourceId === resourceId,
    );
  },

  getRecent(n) {
    return get().entries.slice(0, n);
  },

  getPage(page, filter) {
    const filtered = filter ? get().getFiltered(filter) : get().entries;
    const totalPages = Math.ceil(filtered.length / MAX_AUDIT_PAGE_SIZE);
    const start = (page - 1) * MAX_AUDIT_PAGE_SIZE;
    return { entries: filtered.slice(start, start + MAX_AUDIT_PAGE_SIZE), totalPages };
  },

  seedDemo() {
    set({ entries: generateDemoAuditEntries(), isLoading: false });
  },

  clear() {
    set({ entries: [], isLoading: false });
  },
}));
