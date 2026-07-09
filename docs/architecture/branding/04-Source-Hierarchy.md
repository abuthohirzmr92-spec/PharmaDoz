# MEDISYNC — Brand Source Hierarchy

## Resolution Order

```
┌─────────────────────────────────────────┐
│ 1. TENANT PREMIUM BRAND                 │
│    tenant_branding.tier = "premium"     │
│    All brand elements available         │
│    └── logo, favicon, PWA, colors,      │
│        email, login, splash             │
├─────────────────────────────────────────┤
│ 2. TENANT REGULAR BRAND                 │
│    tenant_branding.tier = "regular"     │
│    Core brand elements only             │
│    └── logo, receipt                    │
│    Fallback to MEDISYNC for:            │
│    └── favicon, PWA, colors, email,     │
│        login, splash                    │
├─────────────────────────────────────────┤
│ 3. MEDISYNC DEFAULT BRAND               │
│    Built-in, always available           │
│    └── Default logo, favicon, PWA,      │
│        colors                           │
└─────────────────────────────────────────┘
```

## Resolution Algorithm

```typescript
function resolveBrand(tenant: Tenant | null, element: BrandElement): BrandAsset {
  // 1. Tenant Premium — full brand
  if (tenant?.branding?.tier === "premium") {
    const asset = tenant.branding[element];
    if (asset) return { source: "tenant_premium", url: asset };
  }

  // 2. Tenant Regular — core elements only
  if (tenant?.branding?.tier === "regular") {
    if (CORE_ELEMENTS.has(element)) {
      const asset = tenant.branding[element];
      if (asset) return { source: "tenant_regular", url: asset };
    }
  }

  // 3. MEDISYNC Default — always available
  return { source: "medisync_default", url: DEFAULT_BRAND[element] };
}

const CORE_ELEMENTS = new Set(["logo", "receipt_logo", "invoice_logo"]);
```

## Update Propagation

```
Admin uploads new logo
  → DB: tenant_branding.updated_at = now
  → CDN: new files uploaded (fingerprinted)
  → Next.js ISR: revalidates brand config (60s TTL)
  → Browser: new URL → automatic fetch (cache bust via fingerprint)
```
