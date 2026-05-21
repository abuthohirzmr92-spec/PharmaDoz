import type { HealthCheck, HealthStatus } from "./types";

export class HealthRegistry {
  private checks = new Map<string, HealthCheck>();

  register(check: HealthCheck): void {
    this.checks.set(check.id, { ...check, lastChecked: new Date().toISOString() });
  }

  unregister(id: string): void {
    this.checks.delete(id);
  }

  getAll(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  getByCategory(category: string): HealthCheck[] {
    return this.getAll().filter((c) => c.category === category);
  }

  getOverallStatus(): HealthStatus {
    const checks = this.getAll();
    if (checks.length === 0) return "unknown";
    if (checks.some((c) => c.status === "unhealthy")) return "unhealthy";
    if (checks.some((c) => c.status === "degraded")) return "degraded";
    if (checks.some((c) => c.status === "unknown")) return "unknown";
    return "healthy";
  }

  clear(): void {
    this.checks.clear();
  }
}

export const healthRegistry = new HealthRegistry();
