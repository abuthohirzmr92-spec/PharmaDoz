import { BaseRepository, mapRows } from "./base";

// ---------------------------------------------------------------------------
// AddonRepository — add-on catalog + capability grants (migrations 057–060)
// ---------------------------------------------------------------------------
// Persistence only. Capability resolution reads addon_grants (Rev #2) — no
// hardcoded feature mapping. Read-only in Phase 2 (write UI is Phase 7).
// ---------------------------------------------------------------------------

export interface AddonItem {
  addonKey: string;
  label: string;
  description: string | null;
  category: string | null;
  price: number;
  billingInterval: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface GrantedCapabilities {
  features: string[];
  services: string[];
  quotas: Record<string, number>;
}

interface GrantRow {
  grant_type: string;
  grant_key: string;
  grant_value: Record<string, unknown> | null;
}

/** Pure: fold add-on grant rows into a capability bundle. */
export function resolveGrantedCapabilities(grants: GrantRow[]): GrantedCapabilities {
  const features: string[] = [];
  const services: string[] = [];
  const quotas: Record<string, number> = {};
  for (const g of grants) {
    if (g.grant_type === "feature") {
      features.push(g.grant_key);
    } else if (g.grant_type === "service") {
      services.push(g.grant_key);
    } else if (g.grant_type === "quota_increment") {
      const v = g.grant_value?.[g.grant_key];
      if (typeof v === "number") quotas[g.grant_key] = v;
    }
  }
  return { features, services, quotas };
}

export class AddonRepository extends BaseRepository {
  async listAddons(): Promise<AddonItem[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("addons")
      .select("addon_key, label, description, category, price, billing_interval, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return this.handleError(error, "AddonRepository.listAddons");
    return mapRows<AddonItem>((data ?? []) as Record<string, unknown>[]);
  }

  async getAddonGrants(addonKey: string): Promise<GrantedCapabilities> {
    if (!this.isConnected) return { features: [], services: [], quotas: {} };
    const { data, error } = await this.client
      .from("addon_grants")
      .select("grant_type, grant_key, grant_value")
      .eq("addon_key", addonKey);
    if (error) return this.handleError(error, "AddonRepository.getAddonGrants");
    return resolveGrantedCapabilities((data ?? []) as GrantRow[]);
  }

  async getPackageAddonKeys(packageId: string): Promise<string[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("package_addons")
      .select("addon_key")
      .eq("package_id", packageId);
    if (error) return this.handleError(error, "AddonRepository.getPackageAddonKeys");
    return ((data ?? []) as { addon_key: string }[]).map((r) => r.addon_key);
  }
}
