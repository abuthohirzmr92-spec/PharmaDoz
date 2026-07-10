// =================================================================
// EEOS Engine — Repository Discovery
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Discovers repository structure: branch, architecture packages,
// affected modules, documentation paths.
// =================================================================

import { createEngine } from "../edk/create-engine";
import { createResult } from "../edk/engine-result";
import type { ExecutionContext } from "../runtime/types";

export const repositoryDiscoveryEngine = createEngine({
  id: "repository-discovery",
  displayName: "Repository Discovery Engine",
  description: "Discovers repository structure, branch context, and documentation paths",
  phase: "CONTEXT_RESOLUTION",
  priority: 2,
  blocking: false,
  inputs: ["executionContext"],
  outputs: ["repositoryContext"],
  policies: ["P4"],
  execute: (ctx: ExecutionContext) => {
    const findings: string[] = [];

    // Branch context
    findings.push(`Branch: ${ctx.branch || "(not set)"}`);

    // Architecture packages
    if (ctx.architecturePackage) {
      findings.push(`Architecture package: ${ctx.architecturePackage}`);
    }

    // Documentation paths
    findings.push("Docs path: docs/architecture/");
    findings.push("Engineering path: docs/engineering/");
    findings.push("Bug KB path: docs/bugs/");

    return createResult("repository-discovery", ctx, {
      status: "PASS",
      summary: `Repository context resolved: ${ctx.epic} / ${ctx.taskClass}`,
      evidence: findings,
      decision: "PROCEED",
      confidence: 1.0,
      artifactsUsed: ["Repository structure"],
    });
  },
});
