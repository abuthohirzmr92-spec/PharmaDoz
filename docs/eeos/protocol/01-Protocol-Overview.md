# EEP v1.0 — Protocol Overview

## What Is EEOS Protocol (EEP)

EEP is the universal communication standard for the EEOS platform. Every component — Runtime, EDK, Execution Engine, Workspace, CLI, Dashboard, Marketplace, Cloud, and plugins — communicates using EEP.

EEP is technology-neutral. It defines WHAT is communicated, not HOW. Implementation is the responsibility of each component.

## Goals

1. **Universal**: One protocol for all EEOS components
2. **Stable**: Backward compatible across minor versions
3. **Discoverable**: Capabilities, versions, and compatibility are machine-readable
4. **Versioned**: Protocol versions evolve independently of implementations
5. **Neutral**: No dependency on any framework, language, or platform

## Non-Goals

- EEP does NOT define wire format (JSON, gRPC, etc. — implementation choice)
- EEP does NOT define transport (HTTP, IPC, in-process — implementation choice)
- EEP does NOT replace Architecture Governance

## Protocol Philosophy

EEP is a CONTRACT, not an implementation. Components agree on WHAT, not HOW.

## Version Evolution

- EEP versions are independent of EEOS runtime versions
- EEP v1.0 is the minimum supported protocol
- Breaking changes → new MAJOR version
- New fields → MINOR version (backward compatible)
- Implementations declare supported EEP versions
