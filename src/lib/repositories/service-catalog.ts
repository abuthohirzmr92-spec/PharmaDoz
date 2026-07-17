import { BaseRepository, mapRows } from "./base";

// ---------------------------------------------------------------------------
// ServiceCatalogRepository — Service > Feature > Package resolution (ADR-31)
// ---------------------------------------------------------------------------
// Reads service_catalog / service_features / package_services (migrations
// 052/053/055). Feeds FeatureResolver: a package activates SERVICES, which map
// to FEATURES. Read-only in Batch 2A (super-admin CRUD is Phase 7).
// Transaction Policy: NONE.
//
// NOTE: service_features is unseeded in Phase 1 (feature-key standardization
// pending) — resolvePackageFeatureKeys returns [] by design until seeded.
// ---------------------------------------------------------------------------

export interface ServiceCatalogItem {
  serviceKey: string;
  label: string;
  description: string | null;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceFeatureItem {
  serviceKey: string;
  featureKey: string;
  label: string | null;
  isActive: boolean;
}

/** Pure: feature keys activated by a set of service keys. */
export function resolveFeatureKeys(
  enabledServiceKeys: string[],
  serviceFeatures: { service_key: string; feature_key: string }[],
): string[] {
  const enabled = new Set(enabledServiceKeys);
  const out = new Set<string>();
  for (const sf of serviceFeatures) {
    if (enabled.has(sf.service_key)) out.add(sf.feature_key);
  }
  return [...out];
}

export class ServiceCatalogRepository extends BaseRepository {
  async listServices(): Promise<ServiceCatalogItem[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("service_catalog")
      .select("service_key, label, description, category, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return this.handleError(error, "ServiceCatalogRepository.listServices");
    return mapRows<ServiceCatalogItem>((data ?? []) as Record<string, unknown>[]);
  }

  async listFeaturesForService(serviceKey: string): Promise<ServiceFeatureItem[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("service_features")
      .select("service_key, feature_key, label, is_active")
      .eq("service_key", serviceKey);
    if (error) return this.handleError(error, "ServiceCatalogRepository.listFeaturesForService");
    return mapRows<ServiceFeatureItem>((data ?? []) as Record<string, unknown>[]);
  }

  async getPackageServiceKeys(packageId: string): Promise<string[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("package_services")
      .select("service_key")
      .eq("package_id", packageId)
      .eq("is_enabled", true);
    if (error) return this.handleError(error, "ServiceCatalogRepository.getPackageServiceKeys");
    return ((data ?? []) as { service_key: string }[]).map((r) => r.service_key);
  }

  /** Resolve the feature-key set a package activates (services → features). */
  async resolvePackageFeatureKeys(packageId: string): Promise<string[]> {
    if (!this.isConnected) return [];
    const serviceKeys = await this.getPackageServiceKeys(packageId);
    if (serviceKeys.length === 0) return [];
    const { data, error } = await this.client
      .from("service_features")
      .select("service_key, feature_key")
      .in("service_key", serviceKeys);
    if (error) return this.handleError(error, "ServiceCatalogRepository.resolvePackageFeatureKeys");
    return resolveFeatureKeys(serviceKeys, (data ?? []) as { service_key: string; feature_key: string }[]);
  }
}
