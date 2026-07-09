# MEDISYNC — Branding Storage Strategy

## Storage Provider

Supabase Storage — same infrastructure as the rest of MEDISYNC.

## Bucket Structure

```
tenant-assets/
  {tenant_id}/
    logo-{hash}.png
    favicon-16-{hash}.png
    favicon-32-{hash}.png
    favicon.ico
    apple-180-{hash}.png
    pwa-192-{hash}.png
    pwa-512-{hash}.png
    splash-{hash}.png
    logo-receipt-{hash}.png

medisync-brand/
    logo.png (bundled default — shipped with app)
    favicon.ico
    pwa-192.png
    pwa-512.png
```

## Naming Convention

- `{asset_type}-{content_hash_8}.{ext}`
- Content hash ensures cache bust on content change
- Old files retained 30 days, then purged by background job

## Versioning

- Not required — content hash is the version
- New upload = new hash = new filename = automatic "version"
- DB stores the current URL; old URLs are dead after 30 days

## Cache Strategy

| Layer | TTL | Notes |
|-------|:---:|-------|
| Supabase Storage | — | Source of truth |
| CDN Edge | 1 year | Immutable (fingerprinted) |
| Browser Cache | 1 year | Immutable (fingerprinted) |
| Next.js ISR | 60s | Brand config JSON (non-fingerprinted) |
| React Context | Session | No refetch within session |
| Service Worker | 1 year | PWA assets pre-cached |
