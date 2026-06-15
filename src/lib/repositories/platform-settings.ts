import { BaseRepository, mapRow } from "./base";

export interface PlatformSettings {
  id: string;
  appName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  sidebarLogoUrl: string | null;
  faviconUrl: string | null;
  extras: Record<string, unknown>;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export class PlatformSettingsRepository extends BaseRepository {
  /** Get the singleton platform settings row. Returns null if never configured. */
  async getSettings(): Promise<PlatformSettings | null> {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from("platform_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      // Table might not exist yet (pre-migration)
      if (error.code === "42P01") return null;
      return this.handleError(error, "getPlatformSettings");
    }
    if (!data) return null;

    return mapRow<PlatformSettings>(data as Record<string, unknown>);
  }

  /** Upsert platform settings — creates the singleton row if it doesn't exist. */
  async saveSettings(data: {
    appName?: string | null;
    tagline?: string | null;
    logoUrl?: string | null;
    sidebarLogoUrl?: string | null;
    faviconUrl?: string | null;
    extras?: Record<string, unknown>;
    updatedBy?: string | null;
  }): Promise<PlatformSettings> {
    if (!this.isConnected) throw new Error("Not connected");

    const existing = await this.getSettings();

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.appName !== undefined) update["app_name"] = data.appName;
    if (data.tagline !== undefined) update["tagline"] = data.tagline;
    if (data.logoUrl !== undefined) update["logo_url"] = data.logoUrl;
    if (data.sidebarLogoUrl !== undefined) update["sidebar_logo_url"] = data.sidebarLogoUrl;
    if (data.faviconUrl !== undefined) update["favicon_url"] = data.faviconUrl;
    if (data.extras !== undefined) update["extras"] = data.extras;
    if (data.updatedBy !== undefined) update["updated_by"] = data.updatedBy;

    if (existing) {
      const { data: row, error } = await this.client
        .from("platform_settings")
        .update(update)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return this.handleError(error, "updatePlatformSettings");
      return mapRow<PlatformSettings>(row as Record<string, unknown>);
    }

    // First insert — create the singleton row
    const insert: Record<string, unknown> = {
      app_name: data.appName ?? null,
      tagline: data.tagline ?? null,
      logo_url: data.logoUrl ?? null,
      sidebar_logo_url: data.sidebarLogoUrl ?? null,
      favicon_url: data.faviconUrl ?? null,
      extras: data.extras ?? {},
      updated_by: data.updatedBy ?? null,
      ...update,
    };

    const { data: row, error } = await this.client
      .from("platform_settings")
      .insert(insert)
      .select()
      .single();

    if (error) return this.handleError(error, "insertPlatformSettings");
    return mapRow<PlatformSettings>(row as Record<string, unknown>);
  }
}
