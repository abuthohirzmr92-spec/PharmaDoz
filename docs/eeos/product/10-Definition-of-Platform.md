# EEOS — Definition of Platform v1.0

## Platform Definition

EEOS is an **Engineering Execution Platform**. It provides:

- A deterministic execution pipeline (Runtime)
- An engine development framework (EDK)
- An execution subsystem (Execution Engine)
- A certified architecture governance system

## Platform Layers

```
┌────────────────────────────────────────┐
│         APPLICATIONS (Host Projects)    │
│  MEDISYNC, Clinic, Portal, any project │
├────────────────────────────────────────┤
│         EXTENSIONS (Community)          │
│  Custom engines, plugins, integrations  │
├────────────────────────────────────────┤
│         PLATFORM (EEOS Core)            │
│  Runtime + EDK + Execution + Engines    │
├────────────────────────────────────────┤
│         FOUNDATION (Architecture)       │
│  Constitution, ADRs, Policies, Memory   │
└────────────────────────────────────────┘
```

## Ownership Boundaries

| Layer | Owned By | Modified By |
|-------|----------|-------------|
| Foundation | Architecture Board | ADR only |
| Platform Core | EEOS Maintainers | PR with review |
| Extensions | Community / Third-party | Plugin author |
| Applications | Host project team | Host project team |

## The Platform Contract

1. Foundation never changes without ADR
2. Platform Core uses semantic versioning
3. Extensions declare compatibility range
4. Applications consume the platform — never modify it
