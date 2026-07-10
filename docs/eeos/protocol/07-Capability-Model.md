# EEP v1.0 — Capability Model

## Capability Catalog

| Capability | Description | Category |
|-----------|-------------|----------|
| architecture-review | Verify architecture compliance | Governance |
| security-review | Security vulnerability analysis | Security |
| performance-analysis | Performance bottleneck detection | Quality |
| dependency-discovery | Identify affected files and modules | Discovery |
| documentation-generation | Generate/update documentation | Documentation |
| test-generation | Suggest test cases | Quality |
| migration-planning | Plan data/schema migrations | Operations |
| deployment-validation | Verify deployment readiness | Operations |
| knowledge-retrieval | Search knowledge base | Discovery |
| risk-analysis | Classify and assess risks | Governance |
| validation | Verify TypeScript/build/tests | Quality |
| reporting | Generate engineering reports | Reporting |
| classification | Classify task type | Discovery |
| execution-planning | Generate implementation plan | Planning |

## Capability Discovery

Engines declare capabilities in their manifest. Marketplace indexes capabilities for search. Runtime resolves capabilities to engines.

## Capability Versioning

Capabilities are versioned independently. Breaking capability changes require new capability ID. Backward-compatible changes increment capability version.
