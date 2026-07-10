# EEP v1.0 — Engine Contract

## Required Identity

| Field | Required | Description |
|-------|:--------:|-------------|
| engineId | Yes | Unique kebab-case identifier |
| displayName | Yes | Human-readable name |
| version | Yes | Semver (e.g., "1.0.0") |
| protocolVersion | Yes | Minimum EEP version |
| phase | Yes | Pipeline phase this engine serves |
| blocking | Yes | Whether failure blocks the pipeline |

## Required Capabilities

| Field | Description |
|-------|-------------|
| inputs | Data this engine requires |
| outputs | Data this engine produces |
| dependencies | Other engines this engine depends on |
| policies | Policies this engine enforces |

## Security Requirements

- Engines declare required permissions
- Runtime enforces permission boundaries
- Plugins run with minimal permissions
- No engine may access another engine's internal state
