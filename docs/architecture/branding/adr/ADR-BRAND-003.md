# ADR-BRAND-003 — Server-Side Asset Processing (Sharp)

## Status: PROPOSED

## Context

Tenants upload a single logo. The system must generate multiple sizes and formats (favicon, PWA icons, splash screen, receipt logo).

## Problem

Where should image processing happen — client-side, server-side, or via external service?

## Decision

**Server-side processing using Sharp (Node.js library).**

- Processing happens in a Next.js API route
- Sharp is fast, native, and handles all required formats
- No external service dependency (unlike Cloudinary)
- Processing is synchronous per upload (acceptable — uploads are rare)

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Client-side (Canvas API) | Limited format support, browser-dependent, can't generate ICO |
| Cloudinary / Imgix | External dependency, cost per processing, vendor lock-in |
| Vercel Image Optimization | Limited to specific dimensions, no ICO generation |

## Consequences

- Sharp must be included in server bundle (~20MB, acceptable)
- Processing happens in API route (may hit timeout for very large images — mitigated by 5MB upload limit)
- No ongoing cost (unlike external services)
