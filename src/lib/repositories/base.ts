import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "@/types";

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function mapRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key];
  }
  return result as T;
}

export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => mapRow<T>(row));
}

export interface TenantContext {
  tenantId: string;
  role: AppRole;
  userId: string;
}

export class BaseRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get client(): any {
    if (!supabase) {
      throw new Error(
        "Database not connected — running in demo mode. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect.",
      );
    }
    return supabase;
  }

  public get isConnected(): boolean {
    return supabase !== null;
  }

  protected pharmacyId: string | undefined;
  protected tenantContext: TenantContext | undefined;
  protected branchId: string | undefined;

  /** @deprecated Use setTenantContext with a full TenantContext object instead */
  setPharmacyContext(pharmacyId: string | undefined): void {
    this.pharmacyId = pharmacyId;
    if (pharmacyId) {
      this.tenantContext = { tenantId: pharmacyId, role: "staff" as any, userId: "" };
    } else {
      this.tenantContext = undefined;
    }
  }

  setTenantContext(ctx: TenantContext | undefined, branchId?: string): void {
    this.tenantContext = ctx;
    this.pharmacyId = ctx?.tenantId;
    this.branchId = branchId;
  }

  setBranchContext(branchId: string | undefined): void {
    this.branchId = branchId;
  }

  getTenantId(): string | undefined {
    return this.tenantContext?.tenantId ?? this.pharmacyId;
  }

  getTenantUserId(): string | undefined {
    return this.tenantContext?.userId;
  }

  protected requireTenant(): string {
    const tid = this.getTenantId();
    if (!tid) {
      throw new Error("Tenant context required — no tenant set on repository.");
    }
    return tid;
  }

  protected withTenantScope(query: any, column: string = "tenant_id"): any {
    const tid = this.getTenantId();
    if (!tid) return query;
    return query.eq(column, tid);
  }

  protected withCrossTenantScope(query: any, column: string = "tenant_id"): any {
    // No-op: cross-tenant queries don't filter by tenant
    return query;
  }

  protected withBranchScope(query: any, column: string = "pharmacy_id"): any {
    if (!this.branchId) return query;
    return query.eq(column, this.branchId);
  }

  protected handleError(error: unknown, context: string): never {
    console.error(`[${context}] Repository error:`, error);
    throw error instanceof Error
      ? error
      : new Error(`Error in ${context}: ${String(error)}`);
  }
}
