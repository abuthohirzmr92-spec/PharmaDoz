# EEOS — Module Architecture v1.0

## Module Map

| Module | Purpose | Dependencies | Public API |
|--------|---------|-------------|------------|
| **Runtime** | Pipeline orchestration, session management | None (core) | `createPipeline`, `executePhase`, `finalize` |
| **EDK** | Engine factory, contracts, validation, registry | Runtime (types only) | `createEngine`, `registerEngine`, `validateEngine` |
| **Execution** | Engine instance lifecycle, state machine | Runtime (types only) | `createInstance`, lifecycle transitions |
| **Engine Library** | Discovery, compliance, risk, docs, release engines | Runtime + EDK + Execution | Per-engine `execute(ctx)` |
| **Workspace** | Persistent storage, history, artifacts | Runtime | `createWorkspace`, `saveSession` |
| **CLI** | Command-line interface | Runtime + Workspace | CLI commands (`init`, `run`, `status`) |
| **Dashboard** | Web UI for monitoring | Runtime + Workspace | React components |
| **SDK** | Public engine development kit | EDK | `createEngine`, `publishEngine` |
| **Plugin System** | Third-party engine loading | EDK + SDK | `loadPlugin`, `validatePlugin` |
| **Marketplace** | Community engine registry | Plugin System | `searchEngines`, `installEngine` |
| **Cloud** | Managed service, multi-project | All | REST API |
| **Enterprise** | Organization governance, LTS | Cloud | Admin API, SSO |

## Dependency Direction

```
Runtime ← EDK ← Execution ← Engine Library
    ↓
Workspace
    ↓
CLI / Dashboard / SDK / Plugin System
    ↓
Marketplace / Cloud / Enterprise
```

No circular dependencies. Each module depends only on modules to its left.
