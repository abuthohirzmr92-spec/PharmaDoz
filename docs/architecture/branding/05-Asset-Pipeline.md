# MEDISYNC — Brand Asset Pipeline

## Single Upload → Multiple Assets

```
Upload: logo.png (any size, max 5MB)
    │
    ▼
Validate
    ├── Format: PNG, JPG, SVG
    ├── Size: <5MB
    └── Dimensions: any (will be resized)
    │
    ▼
Process (Sharp library — server-side)
    ├── 1:1 square crop (center)
    ├── Resize to target dimensions
    └── Optimize (compress, strip metadata)
    │
    ▼
Generate assets:
    ├── logo-original.png       (original, max 512px wide)
    ├── logo-small.png          (128×128, for header/sidebar)
    ├── logo-receipt.png        (B&W, 256px wide, for thermal print)
    ├── favicon-16.png          (16×16)
    ├── favicon-32.png          (32×32)
    ├── favicon.ico             (16+32 multi-size)
    ├── apple-touch-icon.png    (180×180)
    ├── pwa-icon-192.png        (192×192)
    ├── pwa-icon-512.png        (512×512)
    └── splash-1242x2688.png    (iPhone template, logo centered)
    │
    ▼
Upload to Supabase Storage
    bucket: tenant-assets
    path:   {tenant_id}/
    │
    ▼
Update DB: tenant_branding
    set logo_url, favicon_url, pwa_icon_192_url, ...
    set updated_at = now()
    │
    ▼
CDN cache: all URLs fingerprinted with content hash
    → immutable, 1-year cache
    → new upload = new hash = automatic cache bust
```

## Regeneration Trigger

- Manual: Admin clicks "Regenerate Assets" in branding settings
- Automatic on first upload only
- NOT triggered on: page load, login, recurring schedule

## Naming Convention

```
{tenant_id}/
  logo-{content_hash_8}.png
  favicon-16-{content_hash_8}.png
  pwa-192-{content_hash_8}.png
  ...

Old files: retained for 30 days, then purged.
```
