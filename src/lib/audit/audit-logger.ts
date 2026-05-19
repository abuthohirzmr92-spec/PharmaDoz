"use client";

import type { AuditAction, AuditEntry } from "@/types";

let auditEntryCounter = 0;

export function generateAuditId(): string {
  auditEntryCounter++;
  const timestamp = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `audit-${timestamp}-${rand}-${auditEntryCounter}`;
}

export function snapshotBefore<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}

export function snapshotAfter<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}

export interface CreateAuditParams {
  action: AuditAction;
  actorId: string;
  actorName: string;
  pharmacyId: string | null;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export function createAuditEntry(params: CreateAuditParams): AuditEntry {
  return {
    id: generateAuditId(),
    action: params.action,
    actorId: params.actorId,
    actorName: params.actorName,
    pharmacyId: params.pharmacyId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    before: params.before ?? null,
    after: params.after ?? null,
    metadata: params.metadata ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function generateDemoAuditEntries(): AuditEntry[] {
  const entries: AuditEntry[] = [];
  const now = Date.now();

  const actors = [
    { id: "user-superadmin", name: "Super Admin" },
    { id: "user-budi", name: "Budi Santoso" },
    { id: "user-siti", name: "Siti Rahmawati" },
    { id: "user-hendra", name: "Hendra Wijaya" },
  ];

  const actions: AuditAction[] = [
    "auth.login",
    "auth.logout",
    "transaction.create",
    "transaction.void",
    "inventory.movement",
    "inventory.opname",
    "expansion.approve",
    "expansion.reject",
    "maintenance.enable",
    "maintenance.disable",
    "quota.change",
  ];

  const pharmacies = [
    { id: "pharm-001", name: "Apotek Sehat" },
    { id: "pharm-002", name: "Apotek Keluarga" },
    { id: "pharm-003", name: "Apotek 24 Jam" },
  ];

  for (let i = 0; i < 30; i++) {
    const actor = actors[i % actors.length]!;
    const action = actions[i % actions.length]!;
    const pharm = pharmacies[i % pharmacies.length]!;
    const timestamp = new Date(now - i * 3600000).toISOString();

    entries.push({
      id: `audit-demo-${i}`,
      action,
      actorId: actor.id,
      actorName: actor.name,
      pharmacyId: action.startsWith("auth.") ? null : pharm.id,
      resourceType: action.includes(".") ? action.split(".")[0]! : "system",
      resourceId: `res-${i}`,
      before: i % 3 === 0 ? { status: "previous", timestamp } : null,
      after: { status: "current", timestamp },
      metadata: { ip: "192.168.1.1", userAgent: "Demo Browser" },
      createdAt: timestamp,
    });
  }
  return entries;
}
