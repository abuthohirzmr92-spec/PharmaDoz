// ---------------------------------------------------------------------------
// RC1 M2 — Storage Area Master Store (Zustand)
// ---------------------------------------------------------------------------
// Lightweight CRUD for tenant storage areas (location master).
// Uses StorageAreaRepository — no direct Supabase queries.
// ---------------------------------------------------------------------------

"use client";

import { create } from "zustand";
import { storageAreaRepo } from "@/lib/repository-instances";
import type { StorageArea, StorageAreaInput } from "@/lib/repositories/storage-area";

// Re-export under legacy name for backward compatibility
export type LocationMaster = StorageArea;
export type LocationInput = StorageAreaInput;

interface LocationMasterState {
  locations: LocationMaster[];
  isLoading: boolean;

  loadLocations: () => Promise<void>;
  addLocation: (input: LocationInput, tenantId: string) => Promise<LocationMaster | null>;
  updateLocation: (id: string, input: LocationInput) => Promise<boolean>;
  toggleActive: (id: string) => Promise<boolean>;
  deleteLocation: (id: string) => Promise<boolean>;
}

export const useLocationMasterStore = create<LocationMasterState>()((set, get) => ({
  locations: [],
  isLoading: false,

  loadLocations: async () => {
    set({ isLoading: true });
    try {
      const locations = await storageAreaRepo.list();
      set({ locations, isLoading: false });
    } catch (err) {
      console.error("[StorageArea] loadLocations failed:", err);
      set({ isLoading: false });
    }
  },

  addLocation: async (input, _tenantId) => {
    // tenantId is inferred from repository context (not passed explicitly)
    if (!input.code?.trim() || !input.name?.trim()) {
      console.warn("[StorageArea] addLocation: code and name required");
      return null;
    }
    try {
      const loc = await storageAreaRepo.create(input);
      set({ locations: [...get().locations, loc] });
      return loc;
    } catch (err) {
      console.error("[StorageArea] addLocation failed:", err);
      return null;
    }
  },

  updateLocation: async (id, input) => {
    if (!input.code?.trim() || !input.name?.trim()) {
      console.warn("[StorageArea] updateLocation: code and name required");
      return false;
    }
    try {
      const updated = await storageAreaRepo.update(id, input);
      set({
        locations: get().locations.map((l) =>
          l.id === id ? updated : l,
        ),
      });
      return true;
    } catch (err) {
      console.error("[StorageArea] updateLocation failed:", err);
      return false;
    }
  },

  toggleActive: async (id) => {
    const loc = get().locations.find((l) => l.id === id);
    if (!loc) return false;
    try {
      const updated = await storageAreaRepo.update(id, {
        isActive: !loc.isActive,
      });
      set({
        locations: get().locations.map((l) =>
          l.id === id ? updated : l,
        ),
      });
      return true;
    } catch (err) {
      console.error("[StorageArea] toggleActive failed:", err);
      return false;
    }
  },

  deleteLocation: async (id) => {
    try {
      const ok = await storageAreaRepo.remove(id);
      if (ok) {
        set({ locations: get().locations.filter((l) => l.id !== id) });
      }
      return ok;
    } catch (err) {
      console.error("[StorageArea] deleteLocation failed:", err);
      return false;
    }
  },
}));
