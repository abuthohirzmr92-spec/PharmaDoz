# ACE v1.0 — Compliance API (Conceptual)

## Endpoints (Conceptual)

| Operation | Input | Output |
|-----------|-------|--------|
| `validateArchitecture` | Module path, rule packs | ComplianceReport |
| `validateProtocol` | Manifest | ComplianceReport |
| `validateEngine` | EngineDefinition | ComplianceReport |
| `validatePlugin` | Plugin manifest + source | ComplianceReport |
| `getViolations` | Module, rule pack | Violation[] |
| `getScore` | Module | number (0–100) |
| `getCertificationStatus` | Engine ID | CertificationLevel |
| `getReport` | Report ID | ComplianceReport |

## Input Contract

All inputs follow EEP Execution Contract. All outputs follow EEP Output Contract.

## Error Responses

| Code | Meaning |
|------|---------|
| INVALID_SCOPE | Module not found |
| RULE_PACK_NOT_FOUND | Rule pack not installed |
| EVIDENCE_UNAVAILABLE | Cannot collect required evidence |
| CERTIFICATION_EXPIRED | Previous certification lapsed |

## No Implementation

This API is a SPECIFICATION. Implementation belongs to ACE engine development (Phase 2+).
