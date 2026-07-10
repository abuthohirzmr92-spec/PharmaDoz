# EEP v1.0 — Manifest Specification

## Manifest Schema

```json
{
  "manifestVersion": "1.0",
  "protocolVersion": "1.0",
  "identity": {
    "id": "my-engine",
    "displayName": "My Engine",
    "version": "1.0.0",
    "description": "Custom discovery engine"
  },
  "capabilities": ["dependency-discovery"],
  "contract": {
    "inputs": ["executionContext"],
    "outputs": ["engineResult"],
    "dependencies": [],
    "policies": ["P1", "P3"]
  },
  "compatibility": {
    "eeosRuntime": ">=2.0.0",
    "protocolVersion": "1.0"
  },
  "publisher": {
    "name": "Author Name",
    "email": "author@example.com"
  },
  "license": "MIT",
  "certification": {
    "level": "community",
    "certifiedAt": "2026-07-10T00:00:00Z"
  },
  "support": {
    "level": "community",
    "docs": "https://example.com/docs"
  }
}
```

## Required Fields

Every manifest MUST include: manifestVersion, protocolVersion, identity (id, displayName, version), contract (inputs, outputs), compatibility (eeosRuntime).

## Optional Fields

capabilities, dependencies, policies, publisher, license, certification, support, tags.

## Digital Signature

Manifests MAY be signed. Marketplace requires signatures for Certified engines. Signature algorithm: Ed25519.
