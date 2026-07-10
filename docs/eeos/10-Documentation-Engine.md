# EEOS v2.0 — Documentation Engine

## Responsibility

Determine documentation impact. Update ONLY affected documents. Never create unnecessary documentation.

## Documentation Minimalism

Every document must earn its existence. If information already exists in:

- Architecture Constitution
- ADR
- Blueprint
- Sprint Plan
- Bug KB

Then no NEW document is created. The existing document is updated if needed.

## Discovery Rules

| Change Type | Documents to Check |
|-------------|-------------------|
| New ADR | `docs/architecture/**/adr/` |
| Bug fix | `docs/bugs/` |
| Architecture change | `docs/architecture/` Blueprint, ADRs |
| New feature | `docs/engineering/` Sprint Plan |
| Process change | `docs/playbooks/` |

## Output

```json
{
  "documents_updated": [],
  "documents_created": [],
  "reason_no_new_docs": "Bug fix documented in existing BUG-INV-REV-001.md"
}
```
