import { BaseRepository } from "./base";

// ---------------------------------------------------------------------------
// SettingsRepository — versioned, config-driven business rules
// ---------------------------------------------------------------------------
// Reads subscription_settings (migration 047). Values are JSONB objects whose
// shape depends on the key (e.g. {"days":14}, {"enabled":true}, {"mode":"auto"},
// {"providers":[...]}, {"days_before":[7,3,0]}). Typed helpers extract a field.
//
// Source of truth for all SLE business rules — NO hardcode elsewhere.
// Transaction Policy: NONE. Cache: in-memory, TTL default 300s.
// ---------------------------------------------------------------------------

interface SettingRow {
  value: Record<string, unknown> | null;
  version: number;
  effective_from: string;
  effective_until: string | null;
}

/**
 * Pure: pick the active setting row for a key given `nowISO`.
 * Active = effective_from <= now AND (effective_until IS NULL OR > now).
 * Winner = highest version among active rows.
 */
export function pickActiveSetting<T extends { version: number; effective_from: string; effective_until: string | null }>(
  rows: T[],
  nowISO: string,
): T | null {
  const now = Date.parse(nowISO);
  const active = rows.filter(
    (r) =>
      Date.parse(r.effective_from) <= now &&
      (r.effective_until === null || Date.parse(r.effective_until) > now),
  );
  if (active.length === 0) return null;
  return active.reduce((best, r) => (r.version > best.version ? r : best));
}

export class SettingsRepository extends BaseRepository {
  private cache = new Map<string, { value: Record<string, unknown> | null; expires: number }>();
  private ttlMs = 300_000; // default; capability.cache.ttl_seconds may override later

  /** Raw JSONB object value for a key, or null if unset. Cached with TTL. */
  async getObject(key: string): Promise<Record<string, unknown> | null> {
    if (!this.isConnected) return null;

    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expires > now) return cached.value;

    const { data, error } = await this.client
      .from("subscription_settings")
      .select("value, version, effective_from, effective_until")
      .eq("key", key);

    if (error) return this.handleError(error, "SettingsRepository.getObject");

    const row = pickActiveSetting((data ?? []) as SettingRow[], new Date().toISOString());
    const value = row?.value ?? null;
    this.cache.set(key, { value, expires: now + this.ttlMs });
    return value;
  }

  async getNumber(key: string, field: string, fallback: number): Promise<number> {
    const obj = await this.getObject(key);
    const v = obj?.[field];
    return typeof v === "number" ? v : fallback;
  }

  async getBool(key: string, field: string, fallback: boolean): Promise<boolean> {
    const obj = await this.getObject(key);
    const v = obj?.[field];
    return typeof v === "boolean" ? v : fallback;
  }

  async getString(key: string, field: string, fallback: string): Promise<string> {
    const obj = await this.getObject(key);
    const v = obj?.[field];
    return typeof v === "string" ? v : fallback;
  }

  async getStringArray(key: string, field: string, fallback: string[]): Promise<string[]> {
    const obj = await this.getObject(key);
    const v = obj?.[field];
    return Array.isArray(v) ? (v as string[]) : fallback;
  }

  /** Clear the in-memory cache (used on settings write / version bump — Phase 7). */
  clearCache(): void {
    this.cache.clear();
  }
}
