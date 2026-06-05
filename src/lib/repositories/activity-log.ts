import { BaseRepository } from "./base";

export interface ActivityLogEntry {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class ActivityLogRepository extends BaseRepository {
  async getLogs(filters?: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ActivityLogEntry[]; count: number }> {
    if (!this.isConnected) return { data: [], count: 0 };

    let query = this.client
      .from("activity_logs")
      .select("*, profile:actor_id(display_name)", { count: "exact" });

    query = this.withTenantScope(query);

    if (filters?.action) query = query.eq("action", filters.action);
    if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("created_at", filters.dateTo);

    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return this.handleError(error, "getLogs");

    const logs: ActivityLogEntry[] = ((data as any[]) ?? []).map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      actorId: r.actor_id,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      metadata: r.metadata ?? {},
      createdAt: r.created_at,
    }));

    return { data: logs, count: count ?? 0 };
  }
}
