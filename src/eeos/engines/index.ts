export { architectureComplianceEngine } from "./architecture-compliance.engine";
export { repositoryDiscoveryEngine } from "./repository-discovery.engine";
export { dependencyDiscoveryEngine } from "./dependency-discovery.engine";
export { policyEngine } from "./policy.engine";
export { releaseRecommendationEngine } from "./release-recommendation.engine";

import { registerEngine } from "../edk/engine-registry";
import { architectureComplianceEngine } from "./architecture-compliance.engine";
import { repositoryDiscoveryEngine } from "./repository-discovery.engine";
import { dependencyDiscoveryEngine } from "./dependency-discovery.engine";
import { policyEngine } from "./policy.engine";
import { releaseRecommendationEngine } from "./release-recommendation.engine";

export function registerAllEngines(): void {
  for (const engine of [
    architectureComplianceEngine,
    repositoryDiscoveryEngine,
    dependencyDiscoveryEngine,
    policyEngine,
    releaseRecommendationEngine,
  ]) {
    registerEngine(engine.definition, engine.execute);
  }
}
