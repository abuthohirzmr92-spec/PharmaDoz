# EEOS — Repository Strategy v1.0

## Decision: Monorepo (Current) → Scoped Packages (v2.0+)

### Current (Monorepo)

```
src/eeos/
├── runtime/       → @eeos/runtime
├── edk/           → @eeos/edk
└── execution/     → @eeos/execution
```

During MEDISYNC development, EEOS lives in the MEDISYNC monorepo. Zero external dependencies. Zero framework coupling.

### Target (v2.0 — Scoped Packages)

```
@eeos/runtime        — Pipeline orchestration
@eeos/edk            — Engine Development Kit
@eeos/execution      — Execution Engine
@eeos/engines/*      — Engine library (published separately)
@eeos/cli            — CLI
@eeos/dashboard      — Web UI
@eeos/sdk            — Public SDK
```

Published to npm under `@eeos/*` scope.

### Versioning

Semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking API changes, pipeline contract changes
- MINOR: New engines, new features, non-breaking API additions
- PATCH: Bug fixes, documentation

### Dependency Direction

```
@eeos/runtime ← @eeos/edk ← @eeos/execution ← @eeos/engines/*
```

Runtime has ZERO dependencies. EDK depends on Runtime types only. Execution depends on Runtime types only. Engine Library depends on all three.
