# MEDISYNC — Branding Risk Analysis

## Risk Register

| # | Risk | Prob | Impact | Severity | Mitigation |
|---|------|:----:|:------:|:--------:|------------|
| R1 | Slug collision during auto-generation | Low | Medium | MEDIUM | Deduplication: append number if collision |
| R2 | DNS wildcard not configured | Low | High | HIGH | Verify DNS before Phase 2 deployment |
| R3 | Asset processing timeout (large files) | Low | Low | LOW | 5MB upload limit; Sharp is fast |
| R4 | CDN cache not invalidating | Low | High | HIGH | Content-hash URLs guarantee cache bust |
| R5 | Tenant uploads inappropriate logo | Medium | Low | LOW | Admin review queue (future); ToS covers this |
| R6 | Subdomain changes break existing bookmarks | Low | Medium | MEDIUM | Old slug → 301 redirect for 90 days |
| R7 | Sharp dependency breaks on Next.js upgrade | Low | Medium | MEDIUM | Pin Sharp version; test on upgrade |
| R8 | Storage bucket permissions misconfigured | Low | High | HIGH | RLS: tenant can only read/write own directory |
| R9 | Multiple tenants claim same slug | Low | Medium | MEDIUM | Unique constraint on slugs column |
| R10 | Premium downgrade loses brand assets | Low | Low | LOW | Assets retained; just hidden from UI |

## Rollback Strategy

| Scenario | Rollback Action | Time |
|----------|----------------|:----:|
| Upload fails | Show error, keep previous logo | Instant |
| Processing fails | Show error, keep previous assets | Instant |
| DNS issue | Remove wildcard, revert to root domain only | <1 hour |
| CDN issue | Serve directly from Supabase Storage | <30 min |
| Storage issue | Fallback to MEDISYNC default brand | Instant |
