# EKG v1.0 — Knowledge Security

## Visibility Levels

| Level | Who Can Read | Who Can Write |
|-------|-------------|---------------|
| **Public** | Anyone | Publishers |
| **Organization** | Org members | Org admins |
| **Workspace** | Workspace members | Workspace owners |
| **Private** | Owner only | Owner only |

## Integrity

- Immutable entities are cryptographically verifiable (future)
- Versioned entities have complete change history
- SUPERSEDES chains are tamper-evident
- Relationships are validated on write

## Access Control

- Knowledge Board assigns visibility levels
- Organization admins control organization-level access
- Enterprise: SSO + RBAC for knowledge access

## Auditability

- All writes are logged
- All reads are logged (Enterprise)
- Audit trail is immutable
