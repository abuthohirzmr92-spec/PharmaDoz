# MEDISYNC — Branding Foundation PRD

## Status: DRAFT

---

## 1. Problem Statement

MEDISYNC currently has no multi-tenant branding. All tenants share the same MEDISYNC logo, favicon, PWA icon, invoice header, and visual identity. Customers cannot differentiate their pharmacy from the platform.

## 2. Vision

Every tenant can apply their own brand identity across all touchpoints — login, dashboard, receipts, invoices, PWA, and customer-facing portals — while MEDISYNC retains mandatory platform attribution.

## 3. Scope

### In Scope

| Feature | Regular | Premium |
|---------|:------:|:------:|
| Tenant logo (header/sidebar) | ✅ | ✅ |
| Receipt/invoice logo | ✅ | ✅ |
| Internal dashboard branding | ✅ | ✅ |
| Login page branding | — | ✅ |
| Custom PWA icon | — | ✅ |
| Custom splash screen | — | ✅ |
| Subdomain (slug.medisync.id) | ✅ | ✅ |
| Tenant brand identity (colors) | — | ✅ |
| Email branding | — | ✅ |
| WhatsApp/share branding | — | ✅ |

### Out of Scope (V1)

- Custom CSS/themes per tenant
- Per-branch branding
- Customer-specific branding within a tenant
- A/B testing of brand variations

## 4. User Stories

### Tenant Owner

- "I want my pharmacy logo to appear on receipts so customers recognize my brand."
- "I want my pharmacy to have its own subdomain so it looks professional."
- "I want to upload my logo once and have it appear everywhere."

### Super Admin

- "I want to manage tenant branding settings from the platform dashboard."
- "I want the slug to be permanent after initial setup unless the tenant pays for a change."

### End Customer

- "I want to see the pharmacy logo when I visit their portal so I know I'm in the right place."

## 5. Functional Requirements

### FR-1: Logo Upload

- Accept: PNG, JPG, SVG (max 5MB)
- Auto-crop to square (1:1 aspect ratio)
- Auto-generate: favicon (16×16, 32×32), PWA icon (192×192, 512×512), splash screen
- Preview before save

### FR-2: Brand Resolution

- System resolves brand at request time based on hostname
- Tenant subdomain → tenant brand
- Root domain → MEDISYNC brand
- Fallback chain: Tenant Premium → Tenant Regular → MEDISYNC Default

### FR-3: Subdomain

- Format: `{slug}.medisync.id`
- Slug: lowercase, alphanumeric + hyphens, 3-30 characters
- Slug change: admin process only, not self-service
- Reserved slugs: "admin", "api", "app", "www", "mail", "smtp", "help", "support"

### FR-4: PWA Generation

- Source: uploaded logo (square crop)
- Outputs: manifest.json, favicon.ico, apple-touch-icon, splash screen
- Cache: CDN with 1-year expiry (fingerprinted URLs)

### FR-5: Platform Attribution

- All invoices/receipts must include: "Powered by MEDISYNC® — www.medisync.id"
- This footer cannot be removed by any tenant

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Logo load time (CDN) | <200ms (p95) |
| Brand resolution | <5ms (in-memory cache) |
| Upload processing | <3 seconds |
| Asset storage | Supabase Storage + CDN |
| Concurrent uploads | 50/second |
| Asset availability | 99.9% |

## 7. Success Metrics

| Metric | Target |
|--------|:-----:|
| Tenant logo adoption | 80% of active tenants |
| Premium branding conversion | 20% of tenants |
| Support tickets (branding) | <5/month |
| Brand resolution errors | <0.1% |
