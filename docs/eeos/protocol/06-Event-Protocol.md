# EEP v1.0 — Event Protocol

## Event Types

| Event | Producer | Consumer | Severity |
|-------|----------|----------|:--------:|
| ExecutionStarted | Runtime | All engines, Dashboard | INFO |
| ExecutionCompleted | Runtime | Workspace, Dashboard, CLI | INFO |
| ExecutionFailed | Runtime | All engines, Dashboard | ERROR |
| ExecutionBlocked | Runtime | Dashboard, CLI | WARNING |
| EngineRegistered | EDK Registry | Runtime, Dashboard | INFO |
| EngineRemoved | EDK Registry | Runtime | INFO |
| WorkspaceCreated | Workspace | Dashboard, CLI | INFO |
| CertificationGranted | Certification Board | Marketplace, Dashboard | INFO |
| PluginInstalled | Marketplace | Runtime, Dashboard | INFO |
| PolicyViolated | Policy Engine | Architecture Board, Dashboard | WARNING |

## Event Payload

Every event must include:
- eventId (unique)
- timestamp (ISO8601)
- producer (component ID)
- type (from catalog above)
- severity (INFO/WARNING/ERROR)
- payload (type-specific data)
- protocolVersion (EEP version)

## Ordering

Events are ordered within a session. Cross-session ordering is not guaranteed.

## Replay

Events are replayable within a session for audit purposes. History events are immutable.
