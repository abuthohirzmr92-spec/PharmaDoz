# EEOS — Organization Architecture v1.0

## Hierarchy

```
Organization
├── id, name, plan (Community/Pro/Enterprise/Cloud)
├── members: Member[]
│
└── Workspace (1:many)
    ├── id, name
    ├── projects: Project[]
    │
    └── Project (1:many)
        ├── id, name, type
        ├── repositories: Repository[]
        │
        └── Repository (1:many)
            ├── id, url, branch
            ├── sessions: ExecutionSession[]
            │
            └── ExecutionSession (1:many)
                ├── id, status, trace
                ├── reports: ExecutionReport[]
                ├── artifacts: Artifact[]
                └── history: HistoryEntry[]
```

## Ownership

| Level | Owned By | Lifecycle |
|-------|----------|-----------|
| Organization | Account owner | Created → Active → Suspended → Archived |
| Workspace | Organization admin | Created → Active → Archived |
| Project | Workspace member | Created → Active → Archived |
| Repository | Project (linked) | Linked → Active → Unlinked |
| Execution Session | EEOS Runtime | Created → Running → Completed/Blocked |
| Reports | Generated from sessions | Immutable after generation |
| Artifacts | Generated from sessions | Immutable after generation |
| History | Accumulated from sessions | Append-only |

## Isolation

- Organizations are fully isolated
- Workspaces within an organization share billing
- Projects within a workspace share configuration
- Repositories are linked (not owned)
- Sessions are project-scoped

## Scalability

Supports organizations with hundreds of projects, thousands of repositories, and millions of execution sessions. History is append-only and partitionable by time.
