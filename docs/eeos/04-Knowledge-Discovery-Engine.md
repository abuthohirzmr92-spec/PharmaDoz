# EEOS v2.0 — Knowledge Discovery Engine

## Responsibility

Search the Knowledge Base for relevant prior art before any implementation begins.

## Discovery Sources

| Source | Location | What It Provides |
|--------|----------|-----------------|
| Bug KB | `docs/bugs/` | Prior bugs with same root cause |
| Retrospectives | `docs/engineering/*Retrospective*` | Process lessons learned |
| War Room Reports | `docs/engineering/*War-Room*` | Architecture review findings |
| Sprint Plans | `docs/engineering/*Execution-Plan*` | Prior implementation patterns |
| ADRs | `docs/architecture/**/adr/` | Architecture decisions |
| Playbooks | `docs/playbooks/` | Engineering procedures |

## Discovery Rules

1. Search bug KB for same module before any fix
2. Search retrospectives for process improvements
3. Search ADRs for architecture constraints
4. Search playbooks for applicable procedures

## Output

```json
{
  "related_bugs": ["BUG-INV-REV-001"],
  "related_adrs": ["ADR-006"],
  "applicable_playbooks": ["react-hooks-playbook.md"],
  "lessons_learned": ["Always check hook order before conditional returns"]
}
```
