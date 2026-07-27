# FINAL PACKAGE MAPPING AUDIT — GAP-001

## 1. Repository Trace — `packageRepo.getPackageById(planUuid).name`

**File:** `src/lib/repositories/package.ts`
**Method:** `getPackageById(id: string): Promise<PackageRow | null>`

### Query
```sql
SELECT * FROM tenant_packages WHERE id = <planUuid> LIMIT 1
```

### Return type — `PackageRow`
```typescript
interface PackageRow {
  id: string;             // UUID (e.g. '00000000-...101')
  name: string;           // internal slug/key (e.g. "basic", "professional", "enterprise")
  label: string;          // display name (e.g. "Basic", "Professional", "Enterprise")
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  monthlyPrice: number;
  isActive: boolean;
  isCustom: boolean;
  featureFlags: Record<string, boolean>;
  mobileAppEnabled: boolean;
  sortOrder: number;
}
```

### Data — `name` column from seed (migration 005)
```sql
INSERT INTO tenant_packages (id, name, label, ...) VALUES
  ('...101', 'basic',        'Basic',        ...),
  ('...102', 'professional', 'Professional', ...),
  ('...103', 'enterprise',   'Enterprise',   ...)
```

**Observation:** `name` = internal identifier (`"basic"`) · `label` = display text (`"Basic"`). These are two distinct fields — `name` is NOT the display label.

## 2. ProvisionTenant() Trace — What it expects

**File:** `src/lib/tenant/provisioning.ts`
**Input type:** `ProvisioningInput.packageSlug?: string`

**Validator:**
```sql
-- Line 100-103 of provisioning-validator.ts
SELECT id, name, is_active FROM tenant_packages WHERE name = <packageSlug> LIMIT 1
```

If `packageSlug` matches `tenant_packages.name`, the validator extracts `pkgRow.id` (UUID). It validates `is_active = true`. The resolved UUID is passed to the RPC as `p_package_id`.

**RPC parameter:** `p_package_id UUID` — references `tenant_packages(id)` FK in the `subscriptions` table.

## 3. Package Mapping Validation

### Complete chain (GAP-001 after cleanup)

```
Step 1: packageRepo.getPackageById(trial.requestedPlanId)
  → SELECT * FROM tenant_packages WHERE id = <UUID>
  → returns { name: "basic", ... }

Step 2: pkg.name
  → "basic"

Step 3: ProvisioningInput.packageSlug = pkg.name
  → packageSlug = "basic"

Step 4: validateProvisioning(input)
  → SELECT id, name, is_active FROM tenant_packages WHERE name = "basic"
  → matches the seed row, extracts pkgRow.id = '<UUID>'

Step 5: provisionTenant()
  → supabase.rpc("provision_tenant", { p_package_id: <UUID> })
  → RPC INSERTs subscription with FK reference to tenant_packages(id)
```

### Compatibility Table

| Step | Expects | Receives | Match? |
|------|---------|----------|:---:|
| `getPackageById()` | UUID param | `trial.requestedPlanId` (UUID) | ✅ |
| `.name` field | internal slug string | `"basic"` / `"professional"` / `"enterprise"` | ✅ |
| `ProvisioningInput.packageSlug` | slug string | `pkg.name` | ✅ |
| Validator `WHERE name = ?` | slug string matching `tenant_packages.name` | `"basic"` etc. | ✅ |
| RPC `p_package_id` | UUID | Extracted by validator from the slug | ✅ |

## 4. Database Schema Verification

**Table:** `tenant_packages` (migration 005)
- `name VARCHAR(50) NOT NULL UNIQUE` — internal identifier used by the app and validator
- `label VARCHAR(100) NOT NULL` — human-readable display name

**Evidence:** Seed values `name='basic'` / `label='Basic'` confirm `name` ≠ `label`. The `getPackageByName()` method also queries `WHERE name = ?`, confirming `name` is the lookup key for packages.

**Field used in cleanup patch:** `pkg.name` — the internal identifier. This is the **correct** field because the validator queries `WHERE name = <value>`.

## 5. Risk Assessment

### Status: 🟢 PASS

**Reason:** `packageRepo.getPackageById().name` returns the internal identifier/slug (`"basic"`, `"professional"`, `"enterprise"`) exactly as the validator expects. The validator matches `tenant_packages.name` against the `packageSlug` input. The mapping is 1:1.

No ambiguity: `name` is the unique internal key (UNIQUE constraint). `label` is the display text — never used as a lookup key.

**What if a custom package has a `name` that is not a known slug?** The validator queries `WHERE name = <packageSlug>`. If the package exists and is active, it passes — regardless of whether it's a built-in or custom package. Custom packages created via `createPackage()` also set `name` as a unique string.

## 6. Final Verdict

### ✅ PASS — 100% COMPATIBLE

`packageRepo.getPackageById(planUuid).name` is the correct field to use as `packageSlug` for `provisionTenant()`. The field represents the internal identifier, not the display label. The provisiong validator uses `WHERE name = ?` to resolve the slug to a UUID. No mismatch exists.

**GAP-001 can be declared CLOSED.**
