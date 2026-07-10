# EKG v1.0 — Knowledge Relationships

## Relationship Types

| Type | Meaning | Cardinality | Example |
|------|---------|:----------:|---------|
| **SUPERSEDES** | New replaces old | 1:1 | ADR-002 SUPERSEDES ADR-001 |
| **GOVERNS** | Authority over | 1:N | Policy GOVERNS Rule |
| **VALIDATES** | Checks compliance | N:M | Rule VALIDATES Artifact |
| **CONSUMES** | Reads from | N:M | Engine CONSUMES Capability |
| **OWNS** | Has ownership | 1:N | Workspace OWNS Project |
| **GENERATES** | Produces | 1:N | Execution GENERATES Report |
| **REFERENCES** | Points to | N:M | Report REFERENCES Evidence |
| **CERTIFIES** | Grants badge | 1:N | CertificationBoard CERTIFIES Engine |
| **IMPLEMENTS** | Realizes in code | N:M | Repository IMPLEMENTS Blueprint |
| **DEPENDS_ON** | Requires | N:M | Engine DEPENDS_ON Protocol |

## Relationship Rules

- SUPERSEDES is transitive: A → B → C means A ultimately superseded by C
- GOVERNS is inherited: Policy governing a category governs all rules in that category
- OWNS is exclusive: only one owner per entity
- REFERENCES is directional: Report → Evidence, never Evidence → Report
