import { supabase } from "@/lib/supabase/client";

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

export class BaseRepository {
  /**
   * Returns the raw Supabase client (typed loosely to work around
   * Database type constraints). Subclasses interact via `from()`.
   */
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

  setPharmacyContext(pharmacyId: string | undefined): void {
    this.pharmacyId = pharmacyId;
  }

  protected withTenantScope(query: any, column: string = "pharmacy_id"): any {
    if (!this.pharmacyId) return query;
    return query.eq(column, this.pharmacyId);
  }

  protected handleError(error: unknown, context: string): never {
    console.error(`[${context}] Repository error:`, error);
    throw error instanceof Error
      ? error
      : new Error(`Error in ${context}: ${String(error)}`);
  }
}
