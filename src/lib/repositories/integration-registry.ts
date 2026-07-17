import { BaseRepository, mapRows } from "./base";

// ---------------------------------------------------------------------------
// IntegrationRegistryRepository — adapter registry (migration 066)
// ---------------------------------------------------------------------------
// Read-only catalog of integration adapters (payment/messaging/storage/health/
// marketplace/api). Per-tenant installs (tenant_integrations) are deferred.
// ---------------------------------------------------------------------------

export interface IntegrationItem {
  integrationKey: string;
  category: string;
  label: string;
  description: string | null;
  status: string;
  isActive: boolean;
  sortOrder: number;
}

/** Pure: group registry items by category. */
export function groupIntegrationsByCategory<T extends { category: string }>(items: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const i of items) {
    (out[i.category] ??= []).push(i);
  }
  return out;
}

const COLS = "integration_key, category, label, description, status, is_active, sort_order";

export class IntegrationRegistryRepository extends BaseRepository {
  async listAll(): Promise<IntegrationItem[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("integrations")
      .select(COLS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return this.handleError(error, "IntegrationRegistryRepository.listAll");
    return mapRows<IntegrationItem>((data ?? []) as Record<string, unknown>[]);
  }

  async listByCategory(category: string): Promise<IntegrationItem[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("integrations")
      .select(COLS)
      .eq("category", category)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return this.handleError(error, "IntegrationRegistryRepository.listByCategory");
    return mapRows<IntegrationItem>((data ?? []) as Record<string, unknown>[]);
  }
}
