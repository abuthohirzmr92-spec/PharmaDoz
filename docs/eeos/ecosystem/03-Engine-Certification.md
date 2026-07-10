# EEOS — Engine Certification v1.0

## Certification Levels

| Level | Badge | Requirements | Review | Marketplace | Compatibility Guarantee |
|-------|:-----:|-------------|:------:|:----------:|:----------------------:|
| **Official** | 🏛️ | Built by EEOS core team, passes all compliance checks | Architecture Board | Featured | Full (LTS) |
| **Certified** | ✅ | Third-party, passes Architecture Compliance + Security Review | Certification Board | Highlighted | Minor versions |
| **Verified** | ✓ | Third-party, passes basic validation + contract compliance | Automated + Peer | Listed | Best effort |
| **Community** | 👥 | Open source, self-published, basic validation passed | Automated | Listed | None |
| **Experimental** | 🧪 | Early development, may break | None | Hidden by default | None |
| **Private** | 🔒 | Organization-only, not published | Organization admin | Not listed | Internal |

## Certification Process

```
Engine submitted
    │
    ▼
Automated Validation (contract, types, lifecycle)
    │
    ├── FAIL → Rejected with report
    │
    └── PASS → Manual Review (for Certified and above)
         │
         ├── Architecture Compliance check
         ├── Security review
         └── Compatibility matrix verified
              │
              ▼
         Certification Granted (with badge)
```

## Upgrade Path

```
Experimental → Community → Verified → Certified
                                      ↓
                                  Official (core team only)
```

## Deprecation

- Official: 2 major versions notice
- Certified: 1 major version notice
- Verified/Community: immediate (marketplace delisted)
- Private: organization-controlled
