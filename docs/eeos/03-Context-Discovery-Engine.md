# EEOS v2.0 — Context Discovery Engine

## Responsibility

Determine the engineering context for a request. What module? What epic? What sprint?

## Discovery Rules

| Signal | Context |
|--------|---------|
| "Inventory", "Stok", "Batch" | Module: Inventory |
| "Cashier", "Kasir", "Cart" | Module: Cashier |
| "Reports", "Laporan" | Module: Reports |
| "Branding", "Logo", "Slug" | Module: Branding |
| "Performance", "Virtual", "Paginate" | Module: Performance Foundation |
| "Checkout", "Payment" | Module: Checkout |

## Affected Modules Map

Based on the request, the engine determines:

1. Primary module
2. Secondary modules (dependencies)
3. Related architecture packages
4. Related ADRs
5. Related engineering plans

## Output

```json
{
  "primary_module": "Inventory",
  "secondary_modules": ["Reports"],
  "epic": "EPIC-INV-001",
  "sprint": "Unknown",
  "architecture_packages": ["performance/"],
  "related_adrs": ["ADR-006"]
}
```
