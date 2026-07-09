# MEDISYNC — Branding Foundation Definition of Done

## Phase 1 — Slug Assignment

- [ ] `slug` column exists on `tenants` table (unique, indexed)
- [ ] All existing tenants have a generated slug
- [ ] Slug validation: 3-30 chars, lowercase alphanumeric + hyphens
- [ ] Reserved slugs enforced
- [ ] Slug change: admin-only API endpoint
- [ ] Tests: slug generation, validation, uniqueness

## Phase 2 — Subdomain Activation

- [ ] Wildcard DNS configured for `*.medisync.id`
- [ ] Next.js middleware parses hostname, extracts slug
- [ ] `x-tenant-slug` header set on every request
- [ ] Root domain shows MEDISYNC branding
- [ ] Subdomain resolves tenant context
- [ ] Tests: hostname parsing, slug extraction, unknown subdomain → redirect

## Phase 3 — Brand Assets

- [ ] `tenant_branding` table created
- [ ] Upload endpoint: POST /api/branding/logo
- [ ] Sharp pipeline: generates all required asset sizes
- [ ] Assets stored in Supabase Storage (tenant-assets bucket)
- [ ] Content-hash fingerprinted URLs
- [ ] MEDISYNC default brand as fallback
- [ ] BrandProvider serves brand context to all components
- [ ] Tests: upload, processing, fallback, CDN URLs

## Phase 4 — PWA + Premium

- [ ] Dynamic manifest.json generation per tenant
- [ ] PWA icons registered per tenant
- [ ] Premium tier: login branding, colors, email
- [ ] Platform attribution footer on all invoices/receipts
- [ ] Tests: manifest generation, tier resolution, footer

## Cross-Cutting

- [ ] TypeScript: 0 errors
- [ ] Build: PASS
- [ ] Existing tests: PASS
- [ ] New tests cover all branding paths
- [ ] No regression in existing auth/tenant/inventory flows
