// ---------------------------------------------------------------------------
// RC1 P0G — Location Master Store (Zustand)
// ---------------------------------------------------------------------------
// Lightweight CRUD for tenant location references.
// Used by product form dropdown, import validation, session scope.
// ---------------------------------------------------------------------------

"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

export interface LocationMaster {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationInput {
  code: string;
  name: string;
}

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
    if (!supabase) return;
    set({ isLoading: true });
    try {
      const { data } = await (supabase as any)
        .from("location_masters")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      set({ locations: (data || []) as LocationMaster[], isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  addLocation: async (input, tenantId) => {
    if (!supabase) return null;
    if (!input.code?.trim() || !input.name?.trim()) return null;
    const { data, error } = await (supabase as any)
      .from("location_masters")
      .insert({
        tenant_id: tenantId,
        code: input.code.trim(),
        name: input.name.trim(),
        is_active: true,
      })
      .select()
      .single();
    if (error || !data) return null;
    const loc = data as LocationMaster;
    set({ locations: [...get().locations, loc] });
    return loc;
  },

  updateLocation: async (id, input) => {
    if (!supabase) return false;
    if (!input.code?.trim() || !input.name?.trim()) return false;
    const { error } = await (supabase as any)
      .from("location_masters")
      .update({ code: input.code.trim(), name: input.name.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return false;
    set({ locations: get().locations.map(l => l.id === id ? { ...l, code: input.code.trim(), name: input.name.trim() } : l) });
    return true;
  },

  toggleActive: async (id) => {
    if (!supabase) return false;
    const loc = get().locations.find(l => l.id === id);
    if (!loc) return false;
    const { error } = await (supabase as any)
      .from("location_masters")
      .update({ is_active: !loc.isActive, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return false;
    set({ locations: get().locations.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l) });
    return true;
  },

  deleteLocation: async (id) => {
    if (!supabase) return false;
    const { error } = await (supabase as any)
      .from("location_masters")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return false;
    set({ locations: get().locations.filter(l => l.id !== id) });
    return true;
  },
}));
