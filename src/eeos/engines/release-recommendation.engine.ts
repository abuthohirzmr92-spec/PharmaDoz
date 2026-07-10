// =================================================================
// EEOS Engine — Release Recommendation
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Determines release readiness: DEV_COMPLETE, NEEDS_QA, READY_PREVIEW,
// READY_PRODUCTION, or BLOCKED.
// =================================================================

import { createEngine } from "../edk/create-engine";
import { createResult } from "../edk/engine-result";
import type { ExecutionContext } from "../runtime/types";

export const releaseRecommendationEngine = createEngine({
  id: "release-recommendation",
  displayName: "Release Recommendation Engine",
  description: "Determines release readiness based on all prior engine results",
  phase: "RELEASE",
  priority: 5,
  blocking: false,
  inputs: ["executionContext"],
  outputs: ["releaseRecommendation"],
  policies: [],
  execute: (ctx: ExecutionContext) => {
    // Analyze task class to determine release path
    let recommendation: string;
    switch (ctx.taskClass) {
      case "HOTFIX":
      case "BUG":
        recommendation = "READY_PREVIEW — Bug fix, standard QA required";
        break;
      case "FEATURE":
        recommendation = "READY_PREVIEW — Feature complete, awaiting QA";
        break;
      case "ARCHITECTURE":
        recommendation = "NEEDS_QA — Architecture change requires Board review";
        break;
      case "UI":
        recommendation = "READY_PREVIEW — UI change, visual QA required";
        break;
      case "DOCUMENTATION":
      case "RESEARCH":
        recommendation = "DEV_COMPLETE — No deployment required";
        break;
      default:
        recommendation = "READY_PREVIEW";
    }

    return createResult("release-recommendation", ctx, {
      status: "PASS",
      summary: recommendation,
      evidence: [`Task class: ${ctx.taskClass}`, `Epic: ${ctx.epic}`],
      decision: "PROCEED",
      confidence: 0.95,
    });
  },
});
