# ACE v1.0 — Compliance Lifecycle

## Stages

```
DISCOVERY → RULE_RESOLUTION → EVIDENCE_COLLECTION → VALIDATION
                                                          │
                                                          ▼
                                                   VIOLATION_DETECTION
                                                          │
                                                          ▼
                                                   SEVERITY_CLASSIFICATION
                                                          │
                                                          ▼
                                                     RECOMMENDATION
                                                          │
                                                          ▼
                                                     CERTIFICATION
                                                          │
                                                          ▼
                                                        REPORT
                                                          │
                                                          ▼
                                                       ARCHIVE
```

## Stage Ownership

| Stage | Owner | Exit |
|-------|-------|------|
| DISCOVERY | Context Engine | Compliance categories identified |
| RULE_RESOLUTION | ACE | Applicable rules loaded |
| EVIDENCE_COLLECTION | ACE | Evidence gathered |
| VALIDATION | ACE | Rules checked against evidence |
| VIOLATION_DETECTION | ACE | Violations identified |
| SEVERITY_CLASSIFICATION | ACE | Severity assigned |
| RECOMMENDATION | ACE | COMPLIANT / NEEDS_FIX / BLOCKED |
| CERTIFICATION | Certification Board | Badge assigned (if applicable) |
| REPORT | ACE | Compliance report generated |
| ARCHIVE | Workspace | Report stored immutably |

## Transitions

Forward only. ARCHIVE is terminal. VALIDATION can loop to EVIDENCE_COLLECTION if more evidence needed.
