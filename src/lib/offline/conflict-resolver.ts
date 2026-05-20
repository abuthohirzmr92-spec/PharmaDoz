export type ConflictStrategy = "server_wins" | "client_wins" | "merge";

export interface ConflictRecord {
  entryId: string;
  entryType: string;
  clientPayload: unknown;
  serverPayload: unknown;
  resolution: ConflictStrategy;
  resolvedAt: string;
}

/**
 * Server-authority conflict resolver.
 * In case of conflict, the server version always wins.
 * Conflicts are logged for audit purposes.
 */
export class ConflictResolver {
  private conflicts: ConflictRecord[] = [];

  resolve(
    entryId: string,
    entryType: string,
    clientPayload: unknown,
    serverPayload: unknown,
  ): { payload: unknown; strategy: ConflictStrategy; conflict: ConflictRecord } {
    const record: ConflictRecord = {
      entryId,
      entryType,
      clientPayload,
      serverPayload,
      resolution: "server_wins",
      resolvedAt: new Date().toISOString(),
    };

    this.conflicts.push(record);

    return {
      payload: serverPayload,
      strategy: "server_wins",
      conflict: record,
    };
  }

  getConflicts(): ReadonlyArray<ConflictRecord> {
    return this.conflicts;
  }

  clearConflicts(): void {
    this.conflicts = [];
  }
}

export const conflictResolver = new ConflictResolver();
