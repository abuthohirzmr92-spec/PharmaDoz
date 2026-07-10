# EEOS — Extension System v1.0

## Plugin Architecture

Third-party engines are loaded as plugins. Each plugin is a directory containing:

```
my-engine/
├── eeos-plugin.json    ← Manifest (id, version, engines)
├── index.ts            ← Entry point
└── engines/
    └── my-engine.ts    ← Engine definition
```

## Plugin Manifest

```json
{
  "id": "my-eeos-plugin",
  "version": "1.0.0",
  "eeos": ">=2.0.0",
  "engines": [
    {
      "id": "my-custom-engine",
      "phase": "DISCOVERY",
      "entry": "./engines/my-engine.ts"
    }
  ]
}
```

## Validation

1. Manifest parsed and validated
2. Engine definitions validated against EDK contracts
3. Lifecycle compatibility checked
4. Dependency resolution (plugin dependencies)
5. Security boundary: plugins run in isolated context

## Isolation

- Plugins cannot access Runtime internals
- Plugins communicate only via EDK contracts
- Plugin failures do not crash the Runtime
- Plugin state is isolated per execution session

## Version Compatibility

- Plugins declare `eeos` semver range
- Runtime checks compatibility before loading
- Incompatible plugins are rejected with clear error
