# MEDISYNC — Branding Foundation Architecture Blueprint

## Status: DRAFT

---

## 1. Brand Resolution Architecture

```
HTTP Request
    │
    ▼
Hostname Parser
    │
    ├── hostname === "medisync.id" (root)
    │     → MEDISYNC Default Brand
    │
    ├── hostname === "*.medisync.id" (tenant subdomain)
    │     → Extract: slug = hostname.split(".")[0]
    │     → Query: TenantBrand by slug
    │     │
    │     ├── Premium tenant → full brand identity
    │     ├── Regular tenant → logo + receipt only
    │     └── Slug not found   → MEDISYNC Default (fallback)
    │
    └── hostname === "localhost" (development)
          → MEDISYNC Default Brand (or dev override)
```

## 2. Brand Source of Truth

```
Database: tenant_branding
  ├── tenant_id (FK → tenants)
  ├── logo_url (Supabase Storage URL)
  ├── logo_original_filename
  ├── favicon_url
  ├── pwa_icon_192_url
  ├── pwa_icon_512_url
  ├── splash_url
  ├── primary_color (hex, nullable)
  ├── secondary_color (hex, nullable)
  ├── tier: "regular" | "premium"
  ├── created_at
  └── updated_at

Database: tenants
  ├── slug (unique, indexed)
  └── ... existing fields
```

## 3. Brand Loading Strategy

```
1. Middleware (Next.js)
   → Parse hostname → extract slug
   → Set x-tenant-slug header

2. BrandProvider (React Context)
   → On mount: fetch tenant brand by slug
   → Cache in memory (React context)
   → Expose: { logo, favicon, colors, tier }

3. Asset Loading
   → All brand assets served via CDN
   → Fingerprinted URLs (content hash)
   → Immutable cache (1 year)
   → New upload → new URL → automatic cache bust

4. Fallback Loading
   → If tenant brand fetch fails → MEDISYNC default
   → If logo 404 → MEDISYNC default logo
   → If subdomain unknown → redirect to medisync.id/login
```

## 4. Brand Fallback Chain

```
Render Brand
    │
    ├── 1. Tenant Premium Brand (tenant_branding.tier = "premium")
    │     └── logo, favicon, PWA, colors, email, login
    │
    ├── 2. Tenant Regular Brand (tenant_branding.tier = "regular")
    │     └── logo, receipt only
    │     └── Missing: PWA, colors, login → MEDISYNC default
    │
    └── 3. MEDISYNC Default Brand
          └── Default logo, favicon, PWA, colors
          └── Always available (bundled asset)
```

## 5. Brand Assets Pipeline

```
User uploads logo (PNG/JPG/SVG)
    │
    ▼
1. Validate: format, size (max 5MB), dimensions
    │
    ▼
2. Process on server (Sharp / edge function):
    ├── Square crop (center)
    ├── favicon-16.png   (16×16)
    ├── favicon-32.png   (32×32)
    ├── favicon.ico      (multi-size)
    ├── apple-180.png    (180×180)
    ├── pwa-192.png      (192×192)
    ├── pwa-512.png      (512×512)
    └── splash-1242.png  (1242×2688 — iPhone template with logo centered)
    │
    ▼
3. Upload to Supabase Storage:
    bucket: tenant-assets/{tenant_id}/
    │
    ▼
4. Update tenant_branding table:
    logo_url, favicon_url, pwa_icon_192_url, etc.
    │
    ▼
5. Generate manifest.json dynamically:
    { "name": "{tenant_name}", "icons": [...], "start_url": "/" }
    │
    ▼
6. CDN cache: all assets fingerprinted with content hash
    → immutable, 1-year expiry
    → new upload = new hash = automatic cache bust
```

## 6. Brand Cache Strategy

| Layer | TTL | Purpose |
|-------|:---:|---------|
| Browser | 1 year (for fingerprinted assets) | Zero re-download |
| CDN | 1 year (immutable) | Global edge cache |
| Next.js ISR | 60 seconds (manifest, brand config) | Fresh but cached |
| In-memory (React context) | Session lifetime | No refetch per page |
| Database | N/A (source of truth) | Single point of update |

## 7. Brand Generation

```
Upload once → generate all sizes → store → serve via CDN

Manual regeneration: Admin clicks "Regenerate" → pipeline re-runs

Automatic regeneration: NOT supported (brands don't change often)
```
