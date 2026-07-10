# EEOS — Workspace Architecture v1.0

## Workspace Model

```
Workspace
├── projectId
├── name
├── sessions: ExecutionSession[]
├── history: ExecutionResult[]
├── artifacts: Artifact[]
├── reports: Report[]
└── configuration: WorkspaceConfig
```

## Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Workspace** | Persistent project container |
| **Execution Session** | One pipeline execution |
| **History** | Immutable record of all past executions |
| **Artifacts** | Generated documents (plans, reports, ADRs) |
| **Reports** | Aggregated metrics across sessions |
| **Configuration** | Project-specific EEOS settings |

## Lifecycle

```
Workspace Created
    │
    ▼
Sessions Executed (many)
    │
    ▼
History Accumulated
    │
    ▼
Reports Generated
    │
    ▼
Workspace Archived (or Deleted)
```

## Storage

- In-memory (current): sessions live only during execution
- File-based (v1.x): JSON files in `.eeos/` directory
- Database (v2.x): SQLite or PostgreSQL for multi-project
