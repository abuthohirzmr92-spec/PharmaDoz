# MEDISYNC — Module Performance Matrix

| Module | Max Dataset | Strategy | Search | Pagination | Render | Priority |
|--------|:----------:|----------|:------:|:----------:|:------:|:--------:|
| **Products** | 100,000+ | Server | Server | Cursor | Virtual | P0 |
| **Inventory** | 50,000+ | Server | Server | Cursor | Virtual | P0 |
| **Purchases** | 10,000+ | Hybrid | Server | Cursor | Virtual | P1 |
| **Sales / Transactions** | 100,000+ | Server | Server | Cursor | Virtual | P0 |
| **Customers** | 50,000+ | Server | Server | Cursor | Virtual | P1 |
| **Reports** | 10,000+ | Server | — | Paginated | Virtual | P1 |
| **Activity Logs** | 1,000,000+ | Server | Server | Cursor | Virtual | P1 |
| **Branches** | <100 | Client | Client | None | All | P2 |
| **Suppliers** | 1,000+ | Hybrid | Client | Offset | Virtual | P2 |
| **Future: Clinic** | 50,000+ | Server | Server | Cursor | Virtual | P1 |
| **Future: Laboratory** | 100,000+ | Server | Server | Cursor | Virtual | P1 |

## Strategy Selection Logic

```
if maxRows <= 100:
  → Client search + sort, render all, no pagination
elif maxRows <= 500:
  → Client search + sort, virtual render, client pagination
else:
  → Server search + sort, cursor pagination, virtual render
```
