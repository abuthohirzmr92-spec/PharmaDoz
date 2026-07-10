# EEP v1.0 — Protocol Principles

## Locked Principles

| # | Principle | Purpose | Trade-off |
|---|-----------|---------|-----------|
| P1 | **Deterministic** | Same input → same output | Cannot support probabilistic protocols |
| P2 | **Framework Neutral** | No dependency on any language or framework | Cannot use framework-specific features |
| P3 | **Stable** | Backward compatible across MINOR versions | Slower protocol evolution |
| P4 | **Backward Compatible** | Old implementations work with new protocol | Cannot remove fields quickly |
| P5 | **Explicit** | Every field has documented purpose and type | More verbose than implicit protocols |
| P6 | **Discoverable** | Capabilities, versions, compatibility are machine-readable | Requires manifest infrastructure |
| P7 | **Versioned** | Protocol versions evolve independently | Version management overhead |
| P8 | **Secure** | Signatures, permissions, isolation | Additional complexity |
| P9 | **Auditable** | Every protocol interaction is traceable | Larger trace storage |
| P10 | **Machine Readable** | Structured format, not free-text | Less human-readable than prose |
| P11 | **Human Readable** | JSON format, documented fields | Larger payload than binary |
| P12 | **Plugin Friendly** | Third-party engines use same protocol | Must maintain stable public API |
| P13 | **Marketplace Ready** | Manifest includes compatibility, certification, capabilities | Manifest maintenance burden |
| P14 | **Cloud Ready** | Protocol works over network (stateless, idempotent) | Local-first optimizations trade-off |

## Enforcement

Protocol principles are enforced by the Protocol Board. Violations block protocol version approval.
