# ACE v1.0 — Certification Workflow

## Stages

```
DRAFT ──► COMPLIANCE_REVIEW ──► VIOLATION_RESOLUTION
                                      │
                                      ▼
                                 BOARD_REVIEW
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                     CERTIFIED    REJECTED    NEEDS_FIX
                         │
                         ▼
                     PUBLISHED
                         │
                         ▼
               PERIODIC_REVALIDATION
                         │
                         ▼
                      REVOKED (if compliance degrades)
```

## Approval Authority

| Certification Level | Approver |
|--------------------|----------|
| Official | Architecture Board (unanimous) |
| Certified | Certification Board (majority) |
| Verified | Automated + Peer Review |
| Community | Automated |
| Experimental | None |
| Private | Organization Admin |

## Renewal

- Official: Annual review
- Certified: Biannual review
- Verified: On MAJOR version change
- Community: On complaint
