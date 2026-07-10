# EEP v1.0 — Compatibility Model

## Compatibility Matrix

| Component | Must Be Compatible With | Version Check |
|-----------|------------------------|---------------|
| Runtime | EEP version | Declared at startup |
| Execution Engine | Runtime contracts | EDK contract validation |
| Engine | EDK contracts + EEP | Manifest declares compatibility |
| Plugin | EDK + EEP + Runtime | Manifest + automated validation |
| Workspace | Runtime + EEP | API version check |
| CLI | Runtime + EEP | CLI version ≥ Runtime version |
| Dashboard | Runtime + EEP | API version check |
| Cloud | All of the above | Managed compatibility |

## Semantic Versioning

- MAJOR: Breaking protocol changes
- MINOR: New fields, backward compatible
- PATCH: Clarifications, no semantic change

## Deprecation Rules

- Protocol fields: 2 MAJOR versions notice before removal
- Engine capabilities: 1 MAJOR version notice
- Deprecated fields emit warnings for 1 version before removal
