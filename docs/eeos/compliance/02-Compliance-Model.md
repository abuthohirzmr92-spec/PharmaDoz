# ACE v1.0 — Compliance Model

## Compliance Categories

| Category | Purpose | Inputs | Blocking? | Owner |
|----------|---------|--------|:--------:|-------|
| **Architecture** | Verify Constitution, Blueprint, ADRs | Architecture docs + source | Yes | Architecture Board |
| **Protocol** | Verify EEP compliance | Manifests + contracts | Yes | Protocol Board |
| **ADR** | Verify decisions are recorded | ADR directory | Yes | Architecture Board |
| **Repository** | Verify repository integrity | Git working tree | No | Engineering Lead |
| **Policy** | Verify 12 policies enforced | Policy Engine output | Yes | Policy Engine |
| **Documentation** | Verify docs completeness | Architecture packages | No | Documentation Engine |
| **Engine** | Verify EDK contract compliance | Engine definitions | Yes | EDK Validator |
| **Manifest** | Verify manifest completeness | Plugin manifests | Yes | Marketplace |
| **Capability** | Verify declared capabilities | Engine capabilities | No | Marketplace |
| **Workspace** | Verify workspace integrity | Workspace state | No | Runtime |
| **Plugin** | Verify plugin compatibility | Plugin + manifest | Yes | Marketplace |
| **Marketplace** | Verify listing compliance | Plugin metadata | No | Marketplace |

## Severity Model

| Severity | Meaning | Certification Impact |
|:--------:|---------|:-------------------:|
| INFO | Informational | None |
| WARNING | Should fix | None (but accumulated warnings may block) |
| MINOR | Must fix within sprint | Blocks Verified badge |
| MAJOR | Must fix before merge | Blocks Certified badge |
| CRITICAL | Blocks all progress | Blocks all badges |
| BLOCKING | Pipeline stops | Blocks everything |
