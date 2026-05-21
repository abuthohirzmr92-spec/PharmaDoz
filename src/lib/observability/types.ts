// Health status levels
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

// A single health check result
export interface HealthCheck {
  id: string;
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked: string; // ISO timestamp
  category: "infrastructure" | "database" | "auth" | "tenant" | "custom";
}

// Tenant health metadata (no business data!)
export interface TenantHealthSnapshot {
  tenantId: string;
  tenantName: string;
  branchCount: number;
  userCount: number;
  lastActivityAt?: string;
  status: "active" | "inactive" | "suspended";
  healthScore: number; // 0-100
  issueCount: number;
}

// Telemetry event (high-level, no business data)
export interface TelemetryEvent {
  id: string;
  timestamp: string;
  source: string; // e.g., "auth", "database", "storage"
  level: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}

// Health registry snapshot
export interface SystemHealthSnapshot {
  timestamp: string;
  overall: HealthStatus;
  checks: HealthCheck[];
  tenantHealth: TenantHealthSnapshot[];
  recentEvents: TelemetryEvent[];
  summary: string; // human-readable summary for AI/display
}
