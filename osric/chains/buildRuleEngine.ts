import { RuleEngine } from '@osric/core/RuleEngine';
import type { RuleEngineConfig } from '@osric/core/RuleEngine';
import { registerRuleChains } from './registerRuleChains';

/**
 * Build a RuleEngine with all rule chains registered.
 */
export function buildRuleEngine(config?: RuleEngineConfig): RuleEngine {
  const engine = new RuleEngine(config);
  registerRuleChains(engine);
  return engine;
}

export default buildRuleEngine;
