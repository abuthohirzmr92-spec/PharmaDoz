import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "@/types";

/** Sentinel UUID used when tenant scope is missing — guarantees zero rows
 *  instead of returning unfiltered cross-tenant data. */
const NO_TENANT_SENTINEL = "00000000-0000-0000-0000-000000000000";

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
  // Optional injected client (e.g. service-role for privileged cron execution).
  // Defaults to the anon module client, preserving all existing behavior.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected injectedClient: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(injectedClient?: any) {
    this.injectedClient = injectedClient;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get client(): any {
    const c = this.injectedClient ?? supabase;
    if (!c) {
      throw new Error(
        "Database not connected — running in demo mode. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect.",
      );
    }
    return c;
  }

  public get isConnected(): boolean {
    return (this.injectedClient ?? supabase) !== null;
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
    if (!tid) {
      if (typeof window !== "undefined") {
        console.error(
          "[TENANT-SCOPE] query executed WITHOUT tenant filter — using sentinel to prevent data leak. " +
          "Stack trace:",
          new Error().stack?.split("\n").slice(1, 4).join("\n"),
        );
      }
      return query.eq(column, NO_TENANT_SENTINEL);
    }
    return query.eq(column, tid);
  }

  protected hasTenantScope(): boolean {
    return !!this.getTenantId();
  }

  protected withCrossTenantScope(query: any, column: string = "tenant_id"): any {
    // No-op: cross-tenant queries don't filter by tenant
    return query;
  }

  protected withBranchScope(query: any, column: string = "pharmacy_id"): any {
    if (!this.branchId) return query;
    return query.eq(column, this.branchId);
  }

  protected hasBranchScope(): boolean {
    return !!this.branchId;
  }

  protected handleError(error: unknown, context: string): never {
    const err = error as Record<string, unknown>;
    // Extract Supabase error details
    const code = err?.code as string | undefined;
    const message = err?.message as string | undefined;
    const details = err?.details as string | undefined;
    const hint = err?.hint as string | undefined;

    const diagnostic = {
      context,
      code: code ?? "UNKNOWN",
      message: message ?? "No message",
      details: details ?? null,
      hint: hint ?? null,
    };

    console.error(`[${context}] Repository error:`, diagnostic);
    console.error(`[${context}] Full error object:`, error);

    // Throw enriched error with Supabase details
    const enriched = new Error(
      `[${context}] code=${diagnostic.code} message=${diagnostic.message}` +
      (details ? ` details=${details}` : "") +
      (hint ? ` hint=${hint}` : ""),
    );
    (enriched as any).supabaseCode = code;
    (enriched as any).supabaseDetails = details;
    (enriched as any).supabaseHint = hint;
    throw enriched;
  }
}
